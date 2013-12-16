#include <myutils.h>
#include <stdlib.h>
#include <string.h>

char *str_replace(char *orig, char *rep, char *with) {
    char *result; // the return string
    char *ins;    // the next insert point
    char *tmp;    // varies
    int len_rep;  // length of rep
    int len_with; // length of with
    int len_front; // distance between rep and end of last rep
    int count;    // number of replacements

    if (!orig)
        return NULL;
    if (!rep)
        rep = "";
    len_rep = strlen(rep);
    if (!with)
        with = "";
    len_with = strlen(with);

    ins = orig;
    for (count = 0; (tmp = strstr(ins, rep)); ++count) {
        ins = tmp + len_rep;
    }

    // first time through the loop, all the variable are set correctly
    // from here on,
    //    tmp points to the end of the result string
    //    ins points to the next occurrence of rep in orig
    //    orig points to the remainder of orig after "end of rep"
    tmp = result = malloc(strlen(orig) + (len_with - len_rep) * count + 1);

    if (!result)
        return NULL;

    while (count--) {
        ins = strstr(orig, rep);
        len_front = ins - orig;
        tmp = strncpy(tmp, orig, len_front) + len_front;
        tmp = strcpy(tmp, with) + len_with;
        orig += len_front + len_rep; // move to next "end of rep"
    }
    strcpy(tmp, orig);
    return result;
}

int token_count (char *string,  char *token) {
  char *p;
  int cnt;
  cnt = 0;

  for (p = string; *p; p++) {
    if (*p == *token) cnt++; // walk through the string, increase the count if found
  }
  return cnt;
}

char* get_token (char *string, char *token) {
  char *r = string;

  while (*r && *r != *token) {
    r++;
  }

  *r++ = '\0';

  //APP_LOG(APP_LOG_LEVEL_DEBUG, "In function - string: %s - r: %s", string, r);

  return r;
}

long myAtoi(const char *s) {
    const char *p = s, *q;
    long n = 0;
    int sign = 1, k = 1;
    //DEBUG("myAtol '%s'", s)
    if (p != NULL) {
        if (*p != '\0') {
            if ((*p == '+') || (*p == '-')) {
                if (*p++ == '-') sign = -1;
            }
            for (q = p; (*p != '\0'); p++);
            for (--p; p >= q; --p, k *= 10) n += (*p - '0') * k;
        }
    }
    return n * sign;
}

