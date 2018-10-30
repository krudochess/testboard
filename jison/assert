%lex

%%
\s+                     /* skip whitespace */
"firstChessProgram"     return 'FCP'
"win"                   return 'WIN'
"win"                   return 'LOSE'
"draw"                  return 'DRAW'
<<EOF>>                 return 'EOF';

/lex

%start assert

%% /* language grammar */

assert : expr EOF { return $1; };

expr : 'FCP' 'WIN' { return yy.a; };
