import React from 'react';
import { Github } from 'lucide-react';

const GithubSection = () => {
  return (
    <div className="border-t border-border pt-6">
      <a 
        href="https://github.com/Zmin2003/Prisma" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-foreground text-background rounded-lg group-hover:scale-110 transition-transform">
            <Github size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">DeepThink</p>
            <p className="text-xs text-muted-foreground">Open source on GitHub</p>
          </div>
        </div>
      </a>
    </div>
  );
};

export default GithubSection;
