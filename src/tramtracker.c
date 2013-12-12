#include <pebble.h>

static Window *window;
static TextLayer *text_layer;
static TextLayer *route_layer;
static TextLayer *time_layer;

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Updating...");
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  Tuplet value = TupletInteger(1, 42);
  dict_write_tuplet(iter, &value);
  app_message_outbox_send();
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Up");
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Down");
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  text_layer = text_layer_create((GRect) { .origin = { 0, 32 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(text_layer, "TramWatch");
  text_layer_set_text_alignment(text_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer));

  route_layer = text_layer_create((GRect) { .origin = { 0, 64 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(route_layer, "Welcome");
  text_layer_set_text_alignment(route_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(route_layer));

  time_layer = text_layer_create((GRect) { .origin = { 0, 96 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(time_layer, "Hooray");
  text_layer_set_text_alignment(time_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(time_layer));
}

static void window_unload(Window *window) {
  text_layer_destroy(text_layer);
}

void out_sent_handler(DictionaryIterator *sent, void *context) {
   // outgoing message was delivered
   text_layer_set_text(text_layer, "Delivered!");
 }


void out_failed_handler(DictionaryIterator *failed, AppMessageResult reason, void *context) {
  // outgoing message failed
  text_layer_set_text(text_layer, "Failed!!");
}
enum {
    AKEY_NUMBER,
    AKEY_TEXT,
};

void in_received_handler(DictionaryIterator *iter, void *context) {
  // incoming message received
  text_layer_set_text(text_layer, "RECEIVED!!");

  char *StopID = NULL;

  //= _T("This ");        // Cascading concatenation
//s1 += _T("is a ");
  Tuple *number_tuple = dict_find(iter, AKEY_NUMBER);
  if (number_tuple) {
  	APP_LOG(APP_LOG_LEVEL_DEBUG, "Int: %s", number_tuple->value->cstring);
  	int size = strlen(number_tuple->value->cstring);
  	StopID = malloc(sizeof(char)*(size+1));
	strcpy(StopID, number_tuple->value->cstring);
  }

  // Check for fields you expect to receive
  Tuple *text_tuple;// = dict_find(iter, AKEY_TEXT);

  bool routeSet = false;
  while ((text_tuple = dict_read_next(iter))) {
  	// Act on the found fields received
  	if (text_tuple) {
    	APP_LOG(APP_LOG_LEVEL_DEBUG, "Text: %s", text_tuple->value->cstring);
    	if (!routeSet) {
    		text_layer_set_text(route_layer, text_tuple->value->cstring);
    		routeSet = true;
    	} else {
    		text_layer_set_text(time_layer, text_tuple->value->cstring);
    	}
  	}
  }

  text_layer_set_text(text_layer, StopID);
  free(StopID);

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
