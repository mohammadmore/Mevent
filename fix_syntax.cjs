const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(`  });
    }
  });

  // Admin routes for vibes`, `  });

  // Admin routes for vibes`);

code = code.replace(`  });
    }
  });

  // Admin routes for flows`, `  });

  // Admin routes for flows`);

code = code.replace(`  });
    }
  });

  // Role management`, `  });

  // Role management`);

fs.writeFileSync('server.ts', code);
