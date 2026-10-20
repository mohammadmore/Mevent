import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Fix the search block
# Right now it has:
#              </div>
#                {searchQuery && (
#                  <div className="flex gap-2 mt-2">
# ...
#                  </div>
#                )}
#            )}
#          </div>

code = code.replace("""                  </div>
                )}
            )}
          </div>""", """                  </div>
                )}
              </div>
            )}
          </div>""")
          
# Also fix the one at the end of App.tsx which says Expected ")" but found "{" around line 1128.
# Wait, let me check the error at 1128.
# 1128|          {/* AI Assistant FAB */} 
# 1129|          {activeTab !== 'loading' && ...
# Wait, the error at 1128 is a consequence of the missing </div> earlier breaking the JSX tree.

with open('src/App.tsx', 'w') as f:
    f.write(code)
