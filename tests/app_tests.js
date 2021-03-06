// TO-DO: add tests for loading indicator when syncing, with success or fail indicator
// TO-DO: fix test "it should attempt a sync if the notes box is blurred"
// TO-DO: make sure that the storing of the note for comparison when box is blurred is working, as it doesn't look to be (despite tests passing)
// TO-DO: add tests for not clearing notes box until the attn is changed; and don't save a new attn event if the attn doesn't change but you hit enter in the attn box (this is so you can go back to editing the same event)
// TO-DO: don't let people enter colons on the main attn input- to prevent there being issues with the filter (eg. note:blah)

window.testing_mode = true;
jQuery.fx.off = true;

$(document).ready(function() {

	/*******
	
	Setup
	
	*******/
	module("setup");
	
	test("it should check status on load", function() {
		var tmp = attn.checkStatus;
		attn.checkStatus = function() {
			attn.checkStatus = tmp;
			ok(1);
		};
		expect(1);
		load();
	});
	
	/*******
	
	Attn box
	
	*******/
	module("attn box", {
		setup: function() {
			$('#attn').attn();
		}
	});
	
	test("it should sync if the enter key is pressed while in the attn box", function() {
		var e = $.Event("keyup"),
			tmp = attn.saveEvent;
		e.keyCode = 13;
		attn.saveEvent = function() {
			attn.saveEvent = tmp;
			ok(1);
		};
		expect(1);
		$('#attn').val("hello")
			.trigger(e);
	});
	test("it should not sync if there is no text in the attn box", function() {
		var e = $.Event("keyup"),
			tmp = attn.saveEvent;
		e.keyCode = 13;
		attn.saveEvent = function() {
			attn.saveEvent = tmp; // in case it does sync
			ok(1);
		};
		$(document).bind("AttnEventPending", function() {
			$(document).unbind("AttnEventPending");
			attn.saveEvent = tmp;
		});
		expect(0);
		$('#attn').val("")
			.trigger(e);
	});
	test("it should select all the text when you focus on the attn box", function() {
		var $attn = $('#attn'),
			selectedText,
			active;
		$attn.val('hello').focus().click();
		active = document.activeElement;
		if('selectionStart' in active) {
			selectedText = $(active).val().substring(active.selectionStart,active.selectionEnd);
		} else { // IE < 9
			selectedText = active.createRange().text;	
		}
		equals(selectedText, "hello");
	});
	
	/*******
	
	Notes
	
	*******/
	module("notes", {
		setup: function() {
			$('#attn').attn();
		}
	});
	
	test("the notes box should open and be focussed if a successful sync is triggered from the attn box", function() {
		var tmp = $.ajax,
			e = $.Event("keyup");
		e.keyCode = 13;
		$.ajax = function(options) {
			options.success();
		};
		ok(!$('#notes').is(":visible"));
		$('#attn').val("hello")
			.trigger(e);
		ok($('#notes').is(":visible"));
		ok($('#notes').is(":focus"));
		$.ajax = tmp;
	});
	test("the notes box should not open when someone switches 'off'", function() {
		var tmp = $.ajax,
			e = $.Event("keyup");
		e.keyCode = 13;
		$.ajax = function(options) {
			options.success();
		};
		ok(!$('#notes').is(":visible"));
		$('#attn').val("off")
			.trigger(e);
		ok(!$('#notes').is(":visible"));
		$.ajax = tmp;		
	});
	test("the notes box should be hidden and cleared if the attn field is clicked on", function() {
		var tmp = $.ajax,
			e = $.Event("keyup");
		e.keyCode = 13;
		$.ajax = function(options) {
			options.success();
		};
		ok(!$('#notes').is(":visible"));
		$('#attn').val("hello")
			.trigger(e);
		ok($('#notes').is(":visible"));
		// from here is relevant to this test
		$('#notes').focus()
			.text("notes")
			.blur();
		$('#attn').focus().click();
		ok(!$('#notes').is(":visible"));
		ok(!$('#notes').val());
		$.ajax = tmp;
	});
	asyncTest("it should attempt a sync if the notes box is blurred and the note has changed", function() {
		var tmp = attn.saveNotes,
			e = $.Event("keyup");
		e.keyCode = 65; // a
		attn.saveNotes = function() {
			ok(1);
			attn.saveNotes = tmp;
			start();
		};
		$('#notes').show().val("a").trigger(e).blur();
		expect(1);
	});
	asyncTest("it should trigger a sync if there is a pause of two seconds after typing in the notes box", function() {
		var e = $.Event("keyup"),
			tmp = attn.saveNotes;
		e.keyCode = 65; // a
		attn.saveNotes = function() {
			ok(1);
			attn.saveNotes = tmp;
			start();
		};
		$('#notes').show()
			.val('a')
			.trigger(e);
		expect(1);
	});
	
	/***** live filter ****/
	/*
		typing a word filters by �project�
		typing �notes:text� filters by notes field
		typing �to:text� filters by date, or marker
		typing �from:text� filters by date, or marker
		combinations of the above
		generates permalink
	*/
	module("live filtering", {
		setup: function() {}
	});
	
	test("given an empty string, it should show all the periods", function() {
		filterPeriods("#attnlist","");
		var $periods = $('#attnlist li ul li'),
			actual = $periods.filter(':visible').length,
			expected = $periods.length;
		equals(actual, expected);
	});

	test("given a plain word, it should hide all periods that don't have projects that the word matches any part of", function() {
		var $periods = $('#attnlist li ul li'),
			actual,
			expected;
		filterPeriods("#attnlist","o");
		actual = $periods.filter(":visible").length;
		expected = 6;
		equals(actual, expected);
		filterPeriods("#attnlist","yo");
		actual = $periods.filter(":visible").length;
		expected = 0;
		equals(actual, expected);
		filterPeriods("#attnlist","vo");
		actual = $periods.filter(":visible").length;
		expected = 1;
		equals(actual, expected);
		filterPeriods("#attnlist","blah");
		actual = $periods.filter(":visible").length;
		expected = 0;
		equals(actual, expected);
		filterPeriods("#attnlist","");
		actual = $periods.filter(":visible").length;
		expected = 6;
		equals(actual, expected);
	});
	
	test("it shouldn't be case-sensitive", function() {
		var $periods = $('#attnlist li ul li'),
			actual,
			expected;
		filterPeriods("#attnlist","V");
		actual = $periods.filter(":visible").length;
		expected = 1;
		equals(actual, expected);
	});
	/*
	test("given a string like 'notes:text', it should hide all periods that don't have notes fields that include 'text'", function() {
		var actual,
			expected;
		actual = attn.filterPeriods("notes:note").length;
		expected = 2;
		equals(actual, expected);
		actual = attn.filterPeriods("notes:second").length;
		expected = 1;
		equals(actual, expected);
		actual = attn.filterPeriods("notes:blah").length;
		expected = 0;
		equals(actual, expected);
		actual = attn.filterPeriods('notes:').length;
		expected = 3;
		equals(actual, expected);
	});
	
	test("given a string like 'notes:\"text here\"', it should hide all periods that don't have notes fields that include 'text here'", function() {
		var actual,
			expected;
		actual = attn.filterPeriods('notes:"a note"').length;
		expected = 2;
		equals(actual, expected);
		actual = attn.filterPeriods('notes:"second note"').length;
		expected = 1;
		equals(actual, expected);
		actual = attn.filterPeriods('notes:"blah note"').length;
		expected = 0;
		equals(actual, expected);
		actual = attn.filterPeriods('notes:""').length;
		expected = 3;
		equals(actual, expected);
	}); */
	
	test("given a string like 'to:20.07.2011', it should hide the periods that don't start pre-July 21st", function() {
		var $periods = $('#attnlist li ul li'),
			actual,
			expected;
		filterPeriods("#attnlist", 'to:10.12.2011');
		actual = $periods.filter(":visible").length;
		expected = 4;
		equals(actual, expected);
		
		filterPeriods("#attnlist", 'to:08.12.2011');
		actual = $periods.filter(":visible").length;
		expected = 2;
		equals(actual, expected);
		
		filterPeriods("#attnlist", 'to:07.12.2011');
		actual = $periods.filter(":visible").length;
		expected = 0;
		equals(actual, expected);
		
		filterPeriods("#attnlist", 'to:');
		actual = $periods.filter(":visible").length;
		expected = 6;
		equals(actual, expected);
	});

	test("given a string like 'from:20.07.2011', it should hide the periods that don't start after July 19th", function() {
		var $periods = $('#attnlist li ul li'),
			actual,
			expected;
		filterPeriods("#attnlist", 'from:12.12.2011');
		actual = $periods.filter(":visible").length;
		expected = 0;
		equals(actual, expected);
		
		filterPeriods("#attnlist", 'from:10.12.2011');
		actual = $periods.filter(":visible").length;
		expected = 4;
		equals(actual, expected);
		
		filterPeriods("#attnlist", 'from:08.12.2011');
		actual = $periods.filter(":visible").length;
		expected = 6;
		equals(actual, expected);
		
		filterPeriods("#attnlist", 'from:');
		actual = $periods.filter(":visible").length;
		expected = 6;
		equals(actual, expected);
	});

	test("given combinations of the filters, it should hide the periods that don't match all the filters", function() {
		var $periods = $('#attnlist li ul li'),
			actual,
			expected;
		filterPeriods("#attnlist", 'spot from:10.12.2011');
		actual = $periods.filter(":visible").length;
		expected = 3;
		equals(actual, expected);
		/*
		filterPeriods("#attnlist", 'to:20.07.2011 from:20.07.2011');
		actual = $periods.filter(":visible").length;
		expected = 1;
		equals(actual, expected);
		
		filterPeriods("#attnlist", 'yo notes:note');
		actual = $periods.filter(":visible").length;
		expected = 1;
		equals(actual, expected);

		filterPeriods("#attnlist", 'yo from:20.07.2011 to:22.07.2011');
		actual = attn.filterPeriods('').length;
		expected = 1;
		equals(actual, expected);
		*/
	});
	/*
	test("it should show any days that have periods", function() {
		
	});
	*/
	test("if a day has no visible periods, it should hide that day", function() {
		filterPeriods("#attnlist","evo");
		var $days = $("#attnlist span.date"),
			actual = $days.filter(':visible').length,
			expected = 1;
		equals(actual, expected);
	});
	
	module("live stats", {
		setup: function() {}
	});
	
	test("it should display the total duration of all visible periods", function() {
		var duration = totalDuration("#attnlist"),
			expected = 37800;
		equals(duration, expected);
	});

	test("it should display the average duration per week of all visible periods", function() {
		// the test data is over four days, but only features three days with periods
		var durationPerDay = averageDuration("#attnlist"),
			numberOfWeeks = 4 / 7,
			expected = 37800 / numberOfWeeks;
		equals(durationPerDay, expected);
	});
	
});
