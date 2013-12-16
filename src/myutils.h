#ifndef MYUTILS_H_INCLUDED
#define MYUTILS_H_INCLUDED

char *str_replace(char *orig, char *rep, char *with);

int token_count (char *string,  char *token);

char* get_token (char *string, char *token);

long myAtoi(const char *s);

#endif