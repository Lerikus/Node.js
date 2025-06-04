import { db } from '../db/index.js';
import { channels, messages, users, channelMembers } from '../db/schema.js';
import { eq, desc, asc, and } from 'drizzle-orm';

export const channelController = {
  // Instead of showing a list, redirect to the first channel
  listChannels: async (c) => {
    try {
      // Find the first channel
      const firstChannel = await db.select().from(channels).limit(1);
      
      if (firstChannel && firstChannel.length > 0) {
        return c.redirect(`/channels/${firstChannel[0].id}`);
      } else {
        // If no channels exist, show the "create channel" page
        return c.redirect('/channels/new');
      }
    } catch (error) {
      return c.render('error', {
        message: 'Failed to load channels',
        error
      });
    }
  },
  
  // Show a single channel with messages
  showChannel: async (c) => {
    const channelId = parseInt(c.req.param('id'));
    const currentUser = c.get('user');
    
    // Get channel details
    const channelResults = await db.select({
      id: channels.id,
      name: channels.name,
      description: channels.description,
      createdAt: channels.createdAt,
      createdByName: users.username,
      createdBy: channels.createdBy
    })
    .from(channels)
    .leftJoin(users, eq(channels.createdBy, users.id))
    .where(eq(channels.id, channelId))
    .limit(1);
    
    if (channelResults.length === 0) {
      return c.redirect('/channels');
    }
    
    const channel = channelResults[0];
    
    // Get messages for this channel
    const channelMessages = await db.select({
      id: messages.id,
      content: messages.content,
      createdAt: messages.createdAt,
      username: users.username
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .where(eq(messages.channelId, channelId))
    .orderBy(messages.createdAt);
    
    // Get all channels for sidebar
    const allChannels = await db.select({
      id: channels.id,
      name: channels.name
    }).from(channels);
    
    // Get channel members
    const members = await db.select({
      id: users.id, 
      username: users.username,
      joinedAt: channelMembers.joinedAt,
      role: channelMembers.role
    })
    .from(channelMembers)
    .leftJoin(users, eq(channelMembers.userId, users.id))
    .where(eq(channelMembers.channelId, channelId))
    .orderBy(asc(users.username));
    
    // Add current user to the channel if not already a member
    const isMember = members.some(member => member.id === currentUser.id);
    
    if (!isMember) {
      await db.insert(channelMembers).values({
        channelId: channelId,
        userId: currentUser.id,
        role: channel.createdBy === currentUser.id ? 'admin' : 'member'
      });
      
      // Add the current user to the members list for display
      members.push({
        id: currentUser.id,
        username: currentUser.username,
        joinedAt: new Date(),
        role: channel.createdBy === currentUser.id ? 'admin' : 'member'
      });
    }
    
    return c.render('channels/show', { 
      channel, 
      messages: channelMessages,
      channels: allChannels,
      members: members,
      user: currentUser,
      isChannelList: false // Not showing the channel list
    });
  },
  
  // Show form to create a new channel
  newChannel: async (c) => {
    return c.render('channels/new');
  },
  
  // Create a new channel
  createChannel: async (c) => {
    const { name, description } = await c.req.parseBody();
    const user = c.get('user');
    
    // Validate input
    if (!name) {
      return c.render('channels/new', { error: 'Channel name is required' });
    }
    
    // Check if channel name already exists
    const existingChannel = await db.select()
      .from(channels)
      .where(eq(channels.name, name))
      .limit(1);
    
    if (existingChannel.length > 0) {
      return c.render('channels/new', { error: 'Channel name already exists' });
    }
    
    // Insert new channel
    await db.insert(channels).values({
      name,
      description,
      createdBy: user.id
    });
    // Get the last inserted channel for this user (by max id)
    const [newChannel] = await db.select()
      .from(channels)
      .where(eq(channels.createdBy, user.id))
      .orderBy(desc(channels.id))
      .limit(1);
    // Redirect to the new channel's page
    return c.redirect(`/channels/${newChannel.id}`);
  },

  // Show form to edit a channel
  editChannel: async (c) => {
    const channelId = parseInt(c.req.param('id'));
    const user = c.get('user');
    
    // Get channel details
    const [channel] = await db.select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);
    
    if (!channel) {
      return c.redirect('/channels');
    }
    
    // Check if user is admin of the channel
    const [membership] = await db.select()
      .from(channelMembers)
      .where(
        and(
          eq(channelMembers.channelId, channelId),
          eq(channelMembers.userId, user.id)
        )
      )
      .limit(1);
    
    if (!membership || membership.role !== 'admin') {
      // Render the channel page with an error if the user is not an admin
      return c.render('channels/show', { 
        error: 'You do not have permission to edit this channel',
        channel,
        user,
        isChannelList: false
      });
    }
    return c.render('channels/edit', { channel });
  },
  
  // Update a channel
  updateChannel: async (c) => {
    const channelId = parseInt(c.req.param('id'));
    const { name, description } = await c.req.parseBody();
    const user = c.get('user');
    
    // Validate input
    if (!name) {
      return c.render('channels/edit', { 
        error: 'Channel name is required',
        channel: { id: channelId, name: '', description: description || '' }
      });
    }
    
    // Check if channel exists
    const [channel] = await db.select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);
    
    if (!channel) {
      return c.redirect('/channels');
    }
    
    // Check if user is admin of the channel
    const [membership] = await db.select()
      .from(channelMembers)
      .where(
        and(
          eq(channelMembers.channelId, channelId),
          eq(channelMembers.userId, user.id)
        )
      )
      .limit(1);
    
    if (!membership || membership.role !== 'admin') {
      return c.redirect(`/channels/${channelId}`);
    }
    
    // Check if the new name already exists in another channel
    if (name !== channel.name) {
      const existingChannels = await db.select()
        .from(channels)
        .where(
          and(
            eq(channels.name, name),
            eq(channels.id, channelId, true) // Check for channels with this name but different id
          )
        )
        .limit(1);
      
      if (existingChannels.length > 0) {
        return c.render('channels/edit', { 
          error: 'Channel name already exists',
          channel: { id: channelId, name, description }
        });
      }
    }
    
    // Update the channel
    await db.update(channels)
      .set({
        name,
        description
      })
      .where(eq(channels.id, channelId));
    
    return c.redirect(`/channels/${channelId}`);
  },
  
  // Delete a channel
  deleteChannel: async (c) => {
    const channelId = parseInt(c.req.param('id'));
    const user = c.get('user');
    
    // Check if channel exists
    const [channel] = await db.select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .limit(1);
    
    if (!channel) {
      return c.redirect('/channels');
    }
    
    // Check if user is admin of the channel
    const [membership] = await db.select()
      .from(channelMembers)
      .where(
        and(
          eq(channelMembers.channelId, channelId),
          eq(channelMembers.userId, user.id)
        )
      )
      .limit(1);
    
    if (!membership || membership.role !== 'admin') {
      return c.redirect(`/channels/${channelId}`);
    }
    
    try {
      // Start a transaction
      await db.transaction(async (tx) => {
        // Delete channel messages
        await tx.delete(messages)
          .where(eq(messages.channelId, channelId));
        
        // Delete channel memberships
        await tx.delete(channelMembers)
          .where(eq(channelMembers.channelId, channelId));
        
        // Delete the channel
        await tx.delete(channels)
          .where(eq(channels.id, channelId));
      });
      
      return c.redirect('/channels');
    } catch (err) {
      return c.redirect(`/channels/${channelId}`);
    }
  }
};
