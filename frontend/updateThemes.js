const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.tsx')) filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync('src/app');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Backgrounds
  content = content.replace(/bg-\[\#0f1117\]/g, 'bg-slate-50 dark:bg-[#0f1117]');
  content = content.replace(/bg-\[\#161b2e\]/g, 'bg-white dark:bg-[#161b2e]');
  content = content.replace(/bg-\[\#1a2540\]/g, 'bg-slate-100 dark:bg-[#1a2540]');
  
  content = content.replace(/bg-black\/30/g, 'bg-slate-100 dark:bg-black/30');
  content = content.replace(/bg-black\/20/g, 'bg-slate-200 dark:bg-black/20');
  content = content.replace(/bg-white\/5/g, 'bg-slate-100 dark:bg-white/5');
  content = content.replace(/bg-white\/10/g, 'bg-slate-200 dark:bg-white/10');
  content = content.replace(/hover:bg-white\/3/g, 'hover:bg-slate-50 dark:hover:bg-white/3');
  content = content.replace(/hover:bg-white\/10/g, 'hover:bg-slate-200 dark:hover:bg-white/10');
  
  // Texts
  content = content.replace(/text-slate-100/g, 'text-slate-900 dark:text-slate-100');
  content = content.replace(/text-slate-200/g, 'text-slate-800 dark:text-slate-200');
  content = content.replace(/text-slate-300/g, 'text-slate-700 dark:text-slate-300');
  content = content.replace(/text-slate-400/g, 'text-slate-600 dark:text-slate-400');
  content = content.replace(/text-white/g, 'text-white dark:text-white'); // keep white on buttons white
  
  // Borders
  content = content.replace(/border-white\/5/g, 'border-slate-200 dark:border-white/5');
  content = content.replace(/border-white\/10/g, 'border-slate-200 dark:border-white/10');
  content = content.replace(/border-white\/8/g, 'border-slate-300 dark:border-white/8');
  content = content.replace(/border-white\/15/g, 'border-slate-300 dark:border-white/15');
  
  // Placeholders
  content = content.replace(/placeholder-slate-700/g, 'placeholder-slate-400 dark:placeholder-slate-700');
  
  fs.writeFileSync(file, content);
});

console.log('Themes classes added successfully.');
