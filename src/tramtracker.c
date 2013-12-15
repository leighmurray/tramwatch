#include <pebble.h>
#include <pebble_fonts.h>


static Window *window;
static TextLayer *text_layer;
static Layer *route_layer;
static Layer *time_layer;
static TextLayer *status_layer;

static void fetch_stop_data (int stop_number) {
  text_layer_set_text(status_layer, "Sending Request...");
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  Tuplet value = TupletInteger(1, stop_number);
  dict_write_tuplet(iter, &value);
  app_message_outbox_send();
}


static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  fetch_stop_data(1923);
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  fetch_stop_data(3400);
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  fetch_stop_data(3605);
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  text_layer = text_layer_create((GRect) { .origin = { 0, 0 }, .size = { bounds.size.w, 50 } });
  text_layer_set_text(text_layer, "TramWatch");
  text_layer_set_text_alignment(text_layer, GTextAlignmentCenter);
  text_layer_set_font(text_layer, fonts_get_system_font(FONT_KEY_BITHAM_42_BOLD));

  route_layer = layer_create((GRect) { .origin = { 0, 42 }, .size = { bounds.size.w, 40 } });

  time_layer = layer_create((GRect) { .origin = { 0, 75 }, .size = { bounds.size.w, 100 } });

  status_layer = text_layer_create((GRect) { .origin = { 0, 132 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(status_layer, "-");
  text_layer_set_text_alignment(status_layer, GTextAlignmentCenter);
  text_layer_set_font(status_layer, fonts_get_system_font(FONT_KEY_GOTHIC_14));

  layer_add_child(window_layer, time_layer);
  layer_add_child(window_layer, route_layer);
  layer_add_child(window_layer, text_layer_get_layer(text_layer));
  layer_add_child(window_layer, text_layer_get_layer(status_layer));
}

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

static int token_count (char *string,  char *token) {
  char *p;
  int cnt;
  cnt = 0;

  for (p = string; *p; p++) {
    if (*p == *token) cnt++; // walk through the string, increase the count if found
  }
  return cnt;
}

static char* get_token (char *string, char *token) {
  char *r = string;

  while (*r && *r != *token) {
    r++;
  }

  *r++ = '\0';

  //APP_LOG(APP_LOG_LEVEL_DEBUG, "In function - string: %s - r: %s", string, r);

  return r;
}

static void render_time_layer (char *times) {
  layer_remove_child_layers(time_layer);

  GRect bounds = layer_get_bounds(time_layer);

  char *ch = ";";

  int cnt = token_count(times, ch);
  int time_width = bounds.size.w / cnt;

  char search[2] = ";";
  int currentStrCnt = 0;
  do {
    char *token = get_token(times, search);

	char *tmp = token;
	token = times;
	times = tmp;

	static char timeNumber[100];
    strncpy(timeNumber, (char *)token, 100);

    static TextLayer *time;
    time = text_layer_create((GRect) { .origin = {time_width * currentStrCnt , 0 }, .size = { time_width, bounds.size.h } });
	char *find = ",";
	char *replace = "\n";
	text_layer_set_text(time, str_replace(timeNumber, find, replace));
    text_layer_set_font(time, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
    text_layer_set_text_alignment(time, GTextAlignmentCenter);
    layer_add_child(time_layer, text_layer_get_layer(time));

	currentStrCnt++;

  } while (strcmp(times, ""));

}

static void render_route_layer (char *routes) {
  layer_remove_child_layers(route_layer);

  GRect bounds = layer_get_bounds(route_layer);

  char *ch = ";";

  int cnt = token_count(routes, ch);
  int route_width = bounds.size.w / cnt;

  char search[2] = ";";
  int currentStrCnt = 0;
  do {
    char *token = get_token(routes, search);

	char *tmp = token;
	token = routes;
	routes = tmp;

	static char routeNumber[100];
    strncpy(routeNumber, (char *)token, 100);

    static TextLayer *route;
    route = text_layer_create((GRect) { .origin = {route_width * currentStrCnt , 0 }, .size = { route_width, bounds.size.h } });
	char *find = ",";
	char *replace = "\n";
	text_layer_set_text(route, str_replace(routeNumber, find, replace));
    text_layer_set_font(route, fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD));
    text_layer_set_text_alignment(route, GTextAlignmentCenter);
    layer_add_child(route_layer, text_layer_get_layer(route));

	currentStrCnt++;

  } while (strcmp(routes, ""));

}

static void window_unload(Window *window) {
  text_layer_destroy(text_layer);
  layer_destroy(route_layer);
  layer_destroy(time_layer);
  text_layer_destroy(status_layer);

}

void out_sent_handler(DictionaryIterator *sent, void *context) {
   // outgoing message was delivered
   text_layer_set_text(status_layer, "Waiting for Response...");
 }


void out_failed_handler(DictionaryIterator *failed, AppMessageResult reason, void *context) {
  // outgoing message failed
  text_layer_set_text(status_layer, "Failed!");
}
enum {
    HEADER_KEY,
    DATA_KEY,
};

void in_received_handler(DictionaryIterator *iter, void *context) {
  // incoming message received
  light_enable_interaction();
  text_layer_set_text(status_layer, "Done");

  Tuple *number_tuple = dict_find(iter, HEADER_KEY);

  int headerLength = strlen(number_tuple->value->cstring) + 1;
  char header[headerLength];
  strncpy(header, number_tuple->value->cstring, headerLength);

  // Check for fields you expect to receive
  Tuple *text_tuple = dict_find(iter, DATA_KEY);

  //text_tuple = dict_read_next(iter);

  // Act on the found fields received

  //APP_LOG(APP_LOG_LEVEL_DEBUG, "Header: %s", header);

  //APP_LOG(APP_LOG_LEVEL_DEBUG, "Data: %s", text_tuple->value->cstring);

  if (strcmp(header, "stopID") == 0) {
   // APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting StopID: %s", text_tuple->value->cstring);
    static char stopID[100];
    strncpy(stopID, (char *)text_tuple->value->cstring, 100);
    text_layer_set_text(text_layer, stopID);
  } else if (strcmp(header, "routes") == 0) {
   // APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting Routes: %s", text_tuple->value->cstring);
    render_route_layer(text_tuple->value->cstring);
  } else if (strcmp(header, "times") == 0){
   // APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting Times: %s", text_tuple->value->cstring);
    render_time_layer(text_tuple->value->cstring);
  }
}


void in_dropped_handler(AppMessageResult reason, void *context) {
  // incoming message dropped
}

static void init(void) {
  window = window_create();
  window_set_click_config_provider(window, click_config_provider);
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  const bool animated = true;
  window_stack_push(window, animated);

  app_message_register_inbox_received(in_received_handler);
  app_message_register_inbox_dropped(in_dropped_handler);
  app_message_register_outbox_sent(out_sent_handler);
  app_message_register_outbox_failed(out_failed_handler);

  const uint32_t inbound_size = 64;
  const uint32_t outbound_size = 64;
  app_message_open(inbound_size, outbound_size);
}

static void deinit(void) {
  window_destroy(window);
}


int main(void) {
  init();

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);

  app_event_loop();
  deinit();
}

