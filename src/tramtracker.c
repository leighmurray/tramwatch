#include <pebble.h>
#include <pebble_fonts.h>
#include <myutils.h>

static Window *window;

static GBitmap *background_image;
static BitmapLayer *background_layer;

static GBitmap *route_layout_image;
static BitmapLayer *route_layout_layer;

static TextLayer *text_layer;
static Layer *route_layer;
static Layer *time_layer;
static TextLayer *status_layer;
int stopIDs[3] = {0};
int currentStop = 0;
int updateInterval = 15;
int updateCounter = 0;
char stopIDString[5];

const int ROUTE_LAYOUT_IMAGE_RESOURCE_IDS[] = {
  RESOURCE_ID_IMAGE_ONE_STOP,
  RESOURCE_ID_IMAGE_TWO_STOP,
  RESOURCE_ID_IMAGE_THREE_STOP,
  RESOURCE_ID_IMAGE_FOUR_STOP,
  RESOURCE_ID_IMAGE_FIVE_STOP,
  RESOURCE_ID_IMAGE_SIX_STOP,
  RESOURCE_ID_IMAGE_SEVEN_STOP,
  RESOURCE_ID_IMAGE_EIGHT_STOP,
  RESOURCE_ID_IMAGE_NINE_STOP
};

//3400 - 1 stop
//1923 - 2 stops
//3405 - 3 stops
//3013 - 9 stops


static void get_config () {
  text_layer_set_text(status_layer, "Getting Config...");
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  char *functionName = "get_config";
  Tuplet value = TupletCString(1, functionName);
  dict_write_tuplet(iter, &value);
  app_message_outbox_send();
}

static void clear_layers () {
	layer_remove_child_layers(route_layer);
	layer_remove_child_layers(time_layer);
}

static void fetch_stop_data () {
  text_layer_set_text(status_layer, "Sending Request...");
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  Tuplet value = TupletInteger(1, stopIDs[currentStop]);
  dict_write_tuplet(iter, &value);
  app_message_outbox_send();
  updateCounter = 0;
}

static void handle_second_tick(struct tm *tick_time, TimeUnits units_changed) {
    updateCounter++;
    if (updateCounter >= updateInterval) {
    	fetch_stop_data();
    }
}

static void set_current_stop (int stopNumber) {
	currentStop = stopNumber;

    snprintf(stopIDString, 5, "%d", stopIDs[currentStop]);
}

static void cycle_current_stop () {
 int n = sizeof(stopIDs)/sizeof(stopIDs[0]);
 int newStop = currentStop+1;
 if (newStop == n){
 	newStop = 0;
 }
 set_current_stop(newStop);
 clear_layers();

 text_layer_set_text(text_layer, stopIDString);
}

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  //fetch_stop_data();
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {

}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  cycle_current_stop();
  fetch_stop_data();
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  background_image = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_BACKGROUND);
  background_layer = bitmap_layer_create(layer_get_frame(window_layer));
  bitmap_layer_set_bitmap(background_layer, background_image);
  layer_add_child(window_layer, bitmap_layer_get_layer(background_layer));

  route_layout_layer = bitmap_layer_create((GRect) { .origin = { 0, 34}, .size = { 144, 105 } });
  layer_add_child(window_layer, bitmap_layer_get_layer(route_layout_layer));

  text_layer = text_layer_create((GRect) { .origin = { 0, 0 }, .size = { bounds.size.w, 50 } });
  text_layer_set_text(text_layer, "TramWatch");
  text_layer_set_text_alignment(text_layer, GTextAlignmentCenter);
  text_layer_set_font(text_layer, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD));
  text_layer_set_background_color(text_layer, GColorClear);

  route_layer = layer_create((GRect) { .origin = { 0, 42 }, .size = { bounds.size.w, 40 } });

  time_layer = layer_create((GRect) { .origin = { 0, 75 }, .size = { bounds.size.w, 100 } });

  status_layer = text_layer_create((GRect) { .origin = { 0, 136 }, .size = { bounds.size.w, 20 } });
  text_layer_set_background_color(status_layer, GColorClear);
  text_layer_set_text_color(status_layer, GColorWhite);
  text_layer_set_text(status_layer, "Connecting to Phone...");
  text_layer_set_text_alignment(status_layer, GTextAlignmentCenter);
  text_layer_set_font(status_layer, fonts_get_system_font(FONT_KEY_GOTHIC_14));

  layer_add_child(window_layer, time_layer);
  layer_add_child(window_layer, route_layer);
  layer_add_child(window_layer, text_layer_get_layer(text_layer));
  layer_add_child(window_layer, text_layer_get_layer(status_layer));
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
    time = text_layer_create((GRect) { .origin = {time_width * currentStrCnt , 5 }, .size = { time_width, bounds.size.h } });
    text_layer_set_background_color(time, GColorClear);
	char *find = ",";
	char *replace = "\n";
	text_layer_set_text(time, str_replace(timeNumber, find, replace));
    text_layer_set_font(time, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD));
    text_layer_set_text_alignment(time, GTextAlignmentCenter);
    layer_add_child(time_layer, text_layer_get_layer(time));

	currentStrCnt++;

  } while (strcmp(times, ""));

}

static void set_route_layout_image (int number_of_routes) {
  if (number_of_routes == 0)
  	return;

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting Route Layout for %d routes.", number_of_routes);
  gbitmap_destroy(route_layout_image);
  route_layout_image = gbitmap_create_with_resource(ROUTE_LAYOUT_IMAGE_RESOURCE_IDS[number_of_routes -1]);
  bitmap_layer_set_bitmap(route_layout_layer, route_layout_image);
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
    route = text_layer_create((GRect) { .origin = {route_width * currentStrCnt , 5 }, .size = { route_width, bounds.size.h } });
    text_layer_set_background_color(route, GColorClear);

	char *find = ",";
	char *replace = "\n";
	text_layer_set_text(route, str_replace(routeNumber, find, replace));
    text_layer_set_font(route, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD));
    text_layer_set_text_alignment(route, GTextAlignmentCenter);
    layer_add_child(route_layer, text_layer_get_layer(route));

	currentStrCnt++;

  } while (strcmp(routes, ""));

  set_route_layout_image(currentStrCnt);
}

static void set_stops (char *stopsToSet) {

  char search[2] = ";";
  int currentStrCnt = 0;

  do {
    char *token = get_token(stopsToSet, search);

	char *tmp = token;
	token = stopsToSet;
	stopsToSet = tmp;
	APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting Stop %d to %s", currentStrCnt, token);
	int stopNumber = myAtoi(token);
	APP_LOG(APP_LOG_LEVEL_DEBUG, "Atoi Worked: %d", stopNumber);
	stopIDs[currentStrCnt] = stopNumber;//

    currentStrCnt++;

  } while (strcmp(stopsToSet, ""));

  text_layer_set_text(status_layer, "Config set");
  fetch_stop_data();
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
    static char stopID[128];
    strncpy(stopID, (char *)text_tuple->value->cstring, 128);
    text_layer_set_text(text_layer, stopID);
  } else if (strcmp(header, "routes") == 0) {
   // APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting Routes: %s", text_tuple->value->cstring);
    render_route_layer(text_tuple->value->cstring);
  } else if (strcmp(header, "times") == 0) {
   // APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting Times: %s", text_tuple->value->cstring);
    render_time_layer(text_tuple->value->cstring);
  } else if (strcmp(header, "set_stops") == 0) {
    set_stops(text_tuple->value->cstring);
  } else if (strcmp(header, "error") == 0) {
  	text_layer_set_text(status_layer, text_tuple->value->cstring);
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

  tick_timer_service_subscribe(SECOND_UNIT, handle_second_tick);

  const uint32_t inbound_size = 64;
  const uint32_t outbound_size = 64;
  app_message_open(inbound_size, outbound_size);
}

static void deinit(void) {
  window_destroy(window);
  tick_timer_service_unsubscribe();
  layer_remove_from_parent(bitmap_layer_get_layer(background_layer));
  bitmap_layer_destroy(background_layer);
  gbitmap_destroy(background_image);
}


int main(void) {
  init();

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);
  app_event_loop();
  deinit();
}

