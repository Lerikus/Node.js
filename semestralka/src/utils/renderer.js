import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viewsDir = path.join(__dirname, '..', 'views');

export const renderer = async (c, next) => {
  c.render = async (template, data = {}) => {
    const viewData = { ...data };
    
    // Get user from the context if available
    const user = c.get('user');
    if (user) {
      viewData.user = user;
    }
    
    try {
      // Set EJS options
      const ejsOptions = {
        views: [viewsDir],
        root: viewsDir,
        filename: path.join(viewsDir, `${template}.ejs`)
      };
      
      const templatePath = path.join(viewsDir, `${template}.ejs`);
      
      // Check if template exists
      if (!fs.existsSync(templatePath)) {
        return c.html(`Template not found: ${template}`);
      }
      
      // Render the template content
      const content = await ejs.renderFile(templatePath, viewData, ejsOptions);
      
      // Add content to the layout data
      viewData.content = content;
      
      // Render the layout with the content
      const layoutPath = path.join(viewsDir, 'layout.ejs');
      const html = await ejs.renderFile(layoutPath, viewData, {
        ...ejsOptions,
        filename: layoutPath
      });
      
      return c.html(html);
    } catch (err) {
      return c.html(`
        <h1>Error rendering template</h1>
        <pre>${err.message}</pre>
      `);
    }
  };
  
  await next();
};
