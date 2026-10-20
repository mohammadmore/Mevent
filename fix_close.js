import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  `}
                        ))}
                      </div>
                    </div>
                  ))}
                  {rsvpEvents.length === 0`,
  `}
                        ))}
                      </div>
                      </div>
                    </div>
                  ))}
                  {rsvpEvents.length === 0`
);

content = content.replace(
  `}
                        ))}
                      </div>
                    </div>
                  ))}
                  {savedEvents.length === 0`,
  `}
                        ))}
                      </div>
                      </div>
                    </div>
                  ))}
                  {savedEvents.length === 0`
);

fs.writeFileSync('src/App.tsx', content);
