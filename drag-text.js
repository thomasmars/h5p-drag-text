var H5P = H5P || {};

/**
 * Drag Text module
 * @external {jQuery} $ H5P.jQuery
 */
H5P.DragText = (function ($) {
  //CSS Main Containers:
  var MAIN_CONTAINER = "h5p-drag";
  var INNER_CONTAINER = "h5p-drag-inner";
  var TASK_CONTAINER = "h5p-drag-task";
  var TITLE_CONTAINER = "h5p-drag-title";
  var WORDS_CONTAINER = "h5p-drag-droppable-words";
  var FOOTER_CONTAINER = "h5p-drag-footer";
  var EVALUATION_CONTAINER = "h5p-drag-evaluation-container";
  var BUTTON_CONTAINER = "h5p-drag-button-bar";
  var DROPZONE_CONTAINER = "h5p-drag-dropzone-container";
  var DRAGGABLES_CONTAINER = "h5p-drag-draggables-container";

  //Special Sub-containers:
  var EVALUATION_SCORE = "h5p-drag-evaluation-score";
  var DROPZONE = "h5p-drag-dropzone";
  var DRAGGABLE = "h5p-drag-draggable";
  var SHOW_SOLUTION_CONTAINER = "h5p-drag-show-solution-container";
  var DRAGGABLES_WIDE_SCREEN = 'h5p-drag-wide-screen';
  var DRAGGABLE_ELEMENT_WIDE_SCREEN = 'h5p-drag-draggable-wide-screen';

  //CSS Buttons:
  var BUTTONS = "h5p-drag-button";
  var CHECK_BUTTON = "h5p-drag-check-button";
  var RETRY_BUTTON = "h5p-drag-retry-button";
  var SHOW_SOLUTION_BUTTON = 'h5p-drag-show-solution-button';

  //CSS Dropzone feedback:
  var CORRECT_FEEDBACK = 'h5p-drag-correct-feedback';
  var WRONG_FEEDBACK = 'h5p-drag-wrong-feedback';

  /**
   * Initialize module.
   * @param {Object} params Behavior settings
   * @param {Number} id Content identification
   *
   * @returns {Object} C Drag Text instance
   */
  function C(params, id) {
    this.$ = $(this);
    this.id = id;

    // Set default behavior.
    this.params = $.extend({}, {
      taskDescription: "Set in adjectives in the following sentence",
      textField: "This is a *nice*, *flexible* content type, which allows you to highlight all the *wonderful* words in this *exciting* sentence.\n"+
        "This is another line of *fantastic* text.",
      checkAnswer: "Check",
      tryAgain: "Retry",
      enableTryAgain: true,
      score: "Score : @score of @total.",
      showSolution : "Show Solution",
      enableShowSolution: true,
      instantFeedback: false
    }, params);
  }

  /**
   * Append field to wrapper.
   * @param {jQuery} container the jQuery object which this module will attach itself to.
   */
  C.prototype.attach = function (container) {
    $(container).addClass(MAIN_CONTAINER);

    this.$inner = $('<div/>', {
      class: INNER_CONTAINER
    });

    $('<div/>', {
      html: this.params.taskDescription,
      class: TITLE_CONTAINER
    }).appendTo(this.$inner);

    $(container).append(this.$inner);

    this.addTaskTo(this.$inner);

    // Add score and button containers.
    this.addFooter();

    //Changes initial layout if widescreen is detected.
    this.changeLayoutToFitWidth();
  };

  /**
   * Change layout if widescreen is detected.
   */
  C.prototype.resize = function () {
    self.changeLayoutToFitWidth();
  };

  /**
   * Append footer to inner block.
   */
  C.prototype.addFooter = function () {
    this.$footer = $('<div/>', {
      'class':FOOTER_CONTAINER
    }).appendTo(this.$inner);

    this.$evaluation = $('<div/>', {
      'class': EVALUATION_CONTAINER
    }).appendTo(this.$footer);

    this.addButtons();
  };

  /**
   * Add check solution, show solution and retry buttons, and their functionality.
   */
  C.prototype.addButtons = function () {
    var self = this;
    self.$buttonContainer = $('<div/>', {'class': BUTTON_CONTAINER});

    // Checking answer button
    self.$checkAnswerButton = $('<button/>', {
      'class': BUTTONS+' '+CHECK_BUTTON,
      type: 'button',
      text: this.params.checkAnswer
    }).appendTo(self.$buttonContainer).click(function () {
      if (!self.showEvaluation()) {
        if (self.params.enableTryAgain) {
          self.$retryButton.show();
        }
        if (self.params.enableShowSolution) {
          self.$showAnswersButton.show();
        }
      }
      else {
        self.$showAnswersButton.hide();
        self.$retryButton.hide();
        self.$checkAnswerButton.hide();
      }
    });

    //Retry button
    self.$retryButton =  $('<button/>', {
      'class': BUTTONS+' '+RETRY_BUTTON,
      type: 'button',
      text: this.params.tryAgain
    }).appendTo(self.$buttonContainer).click(function () {
      self.resetTask();
      self.addDraggablesRandomly(self.$draggables);
      self.hideEvaluation();
      self.$retryButton.hide();
      self.$checkAnswerButton.show();
      if (self.params.enableShowSolution) {
        self.$showAnswersButton.hide();
      }
      self.droppablesArray.forEach(function (droppable) {
        droppable.hideSolution();
      });
    });

    //Show Solution button
    self.$showAnswersButton = $('<button/>', {
      'class': BUTTONS+' '+SHOW_SOLUTION_BUTTON,
      type: 'button',
      text: this.params.showSolution
    }).appendTo(self.$buttonContainer).click(function () {
      self.droppablesArray.forEach( function (droppable) {
        droppable.showSolution();
      });
      self.$showAnswersButton.hide();
    });

    self.$buttonContainer.appendTo(self.$footer);
  };

  /**
   * Resets the draggables back to their original position.
   */
  C.prototype.resetTask = function () {
    var self = this;
    self.draggablesArray.forEach(function (entry) {
      self.moveDraggableToDroppable(entry, null);
    });
  };

  /**
   * Shows feedback for dropzones.
   */
  C.prototype.showDropzoneFeedback = function () {
    this.droppablesArray.forEach( function (droppable) {
      droppable.setFeedback();
    });
  };

  /**
   * Evaluate task and display score text for word markings.
   *
   * @return {Boolean} Returns true if maxScore was achieved.
   */
  C.prototype.showEvaluation = function () {
    this.hideEvaluation();
    this.calculateScore();
    this.showDropzoneFeedback();

    var score = this.correctAnswers;
    var maxScore = this.droppablesArray.length;

    var scoreText = this.params.score.replace(/@score/g, score.toString())
      .replace(/@total/g, maxScore.toString());

    //Append score to evaluation container.
    $('<div/>', {
      'class': EVALUATION_SCORE,
      html: scoreText
    }).appendTo(this.$evaluation);

    if (score === maxScore) {
      this.$checkAnswerButton.hide();
      this.$showAnswersButton.hide();
      this.$retryButton.hide();
      this.disableDraggables();
    }
    return score === maxScore;
  };

  /**
   * Calculate score and store them in class variables.
   */
  C.prototype.calculateScore = function () {
    var self = this;
    self.correctAnswers = 0;
    self.droppablesArray.forEach(function (entry) {
      if(entry.isCorrect()) {
        self.correctAnswers += 1;
      }
    });
  };

  /**
   * Clear the evaluation text.
   */
  C.prototype.hideEvaluation = function () {
    this.$evaluation.html('');
  };
  
  /**
   * Handle task and add it to container.
   * @param {jQuery} $container The object which our task will attach to.
   */
  C.prototype.addTaskTo = function ($container) {
    var self = this;
    self.widest = 0;
    self.clozesArray = [];
    self.droppablesArray = [];
    self.draggablesArray = [];

    self.$taskContainer = $('<div/>', {
      'class': TASK_CONTAINER
    });

    self.$draggables = $('<div/>', {
      'class': DRAGGABLES_CONTAINER
    });

    self.$wordContainer = $('<div/>', {'class': WORDS_CONTAINER});
    self.handleText();

    self.addDraggablesRandomly(self.$draggables);
    self.$wordContainer.appendTo(self.$taskContainer);
    self.$draggables.appendTo(self.$taskContainer);
    self.$taskContainer.appendTo($container);
    self.addDropzoneWidth();
  };

  /**
   * Adds the draggables on the right side of the screen if widescreen is detected.
   */
  C.prototype.changeLayoutToFitWidth = function () {
    var self = this;
    if (screen.width > screen.height) {
      // Adds a class that floats the draggables to the right.
      self.$draggables.addClass(DRAGGABLES_WIDE_SCREEN);
      // Detach and reappend the wordContainer so it will fill up the remaining space left by draggables.
      self.$wordContainer.detach().appendTo(self.$taskContainer);
      // Set margin so the wordContainer does not expand when there are no more draggables left.
      self.$wordContainer.css({'margin-right': this.widest});
      // Set all draggables to be blocks
      self.draggablesArray.forEach(function (draggable) {
        draggable.getDraggableElement().addClass(DRAGGABLE_ELEMENT_WIDE_SCREEN);
      });
    }
    else {
      // Remove the specific wide screen settings.
      self.$wordContainer.css({'margin-right': 0});
      self.$draggables.removeClass(DRAGGABLES_WIDE_SCREEN);
      self.$draggables.detach().appendTo(self.$taskContainer);
      self.draggablesArray.forEach(function (draggable) {
        draggable.getDraggableElement().removeClass(DRAGGABLE_ELEMENT_WIDE_SCREEN);
      });
    }
  };

  /**
   * Parses the text and sends identified dropzones to the addDragNDrop method for further handling.
   * Appends the parsed text to wordContainer.
   */
  C.prototype.handleText = function () {
    var self = this;
    var textField = self.params.textField;
    // Go through the text and replace all the asterisks with input fields
    var dropStart = textField.indexOf('*');
    var currentIndex = 0;
    //While the start of a dropbox is found
    while (dropStart !== -1) {
      dropStart++;
      var dropEnd = textField.indexOf('*', dropStart);
      if (dropEnd === -1) {
        continue; // No end
      }
      //Appends the text between each dropzone
      self.$wordContainer.append(textField.slice(currentIndex, dropStart - 1));
      //Adds the drag n drop functionality when an answer is found
      self.addDragNDrop(textField.substring(dropStart, dropEnd));
      dropEnd++;
      currentIndex = dropEnd;
      //Attempts to find the beginning of the next answer.
      dropStart = textField.indexOf('*', dropEnd);
    }
    //Appends the remaining part of the text.
    self.$wordContainer.append(textField.slice(currentIndex, textField.length-1));
  };

  /**
   * Matches the width of all dropzones to the widest draggable.
   */
  C.prototype.addDropzoneWidth = function () {
    var widest = 0;
    //Find widest draggable
    this.draggablesArray.forEach( function (draggable) {
      if ($(draggable.getDraggableElement()).innerWidth() > widest) {
        if (draggable.getDraggableElement().html().length >= 20) {
          draggable.setShortFormat();
          widest = $(draggable.getDraggableElement()).innerWidth();
          draggable.removeShortFormat();
        }
        else {
          widest = $(draggable.getDraggableElement()).innerWidth();
        }
      }
    });
    //add 20% padding:
    widest = widest + (widest/5);
    //set value for use when resizing window.
    this.widest = widest;
    //Adjust all droppable to widest size.
    this.droppablesArray.forEach( function (droppable) {
      droppable.getDropzone().width(widest);
    });
  };

  /**
   * Makes a drag n drop from the specified text.
   * @param {String} text Text for the drag n drop.
   */
  C.prototype.addDragNDrop = function (text) {
    var self = this;
    var tip = undefined;
    var answer = text;
    var answersAndTip = answer.split(':');

    if(answersAndTip.length > 0) {
      answer = answersAndTip[0];
      tip = answersAndTip[1];
    }

    //Make the draggable
    var $draggable = $('<div/>', {
      text: answer,
      'class': DRAGGABLE
    }).draggable({
      revert: function (isValidDrop) {
        var dropzone = droppable;
        if (!isValidDrop) {
          self.moveDraggableToDroppable(draggable, null);
          return true;
        }
        if (self.params.instantFeedback) {
          if (dropzone !== null) {
            dropzone.setFeedback();
          }
          self.instantFeedbackEvaluation();
        }
        return !isValidDrop;
      }
    });

    var draggable = new Draggable(answer, $draggable);

    //Make the dropzone
    var $dropzoneContainer = $('<div/>', {
      'class': DROPZONE_CONTAINER
    });
    var $dropzone = $('<div/>', {
      'class': DROPZONE
    }).appendTo($dropzoneContainer)
        .droppable({
      drop: function( event, ui) {
        self.draggablesArray.forEach( function (draggable) {
          if (draggable.getDraggableElement().is(ui.draggable)) {
            self.moveDraggableToDroppable(draggable, droppable);
          }
        });
        if (self.params.instantFeedback) {
          droppable.setFeedback();
          self.instantFeedbackEvaluation();
        }
      }
    });

    var droppable = new Droppable(answer, tip, $dropzone, $dropzoneContainer);
    droppable.appendDroppableTo(self.$wordContainer);

    self.draggablesArray.push(draggable);
    self.droppablesArray.push(droppable);
  };

  /**
   * Moves a draggable onto a droppable, and updates all parameters in the objects.
   * @param {Draggable} draggable Draggable instance.
   * @param {Droppable} droppable The droppable instance the draggable is put on.
   */
  C.prototype.moveDraggableToDroppable = function (draggable, droppable) {
    draggable.removeFromZone();
    if (droppable !== null) {
      droppable.appendInsideDroppableTo(this.$draggables);
      droppable.setDraggable(draggable);
      draggable.appendDraggableTo(droppable.getDropzone());
    }
    else {
      draggable.appendDraggableTo(this.$draggables);
    }
  };

  /**
   * Adds the draggable words to the provided container in random order.
   * @param {jQuery} $container Container the draggables will be added to.
   */
  C.prototype.addDraggablesRandomly = function ($container) {
    var tempArray = this.draggablesArray.slice();
    while (tempArray.length >= 1) {
      var randIndex = parseInt(Math.random()*tempArray.length);
      tempArray[randIndex].appendDraggableTo($container);
      tempArray.splice(randIndex, 1);
    }
  };

  /**
   * Feedback function for checking if all fields are filled, and show evaluation if that is the case.
   */
  C.prototype.instantFeedbackEvaluation = function () {
    var self = this;
    var allFilled = true;
    self.draggablesArray.forEach(function (entry) {
      if (entry.insideDropzone === null) {
        allFilled = false;
        //Hides "retry" and "show solution" buttons.
        self.$retryButton.hide();
        self.$showAnswersButton.hide();

        //Hides evaluation text.
        self.hideEvaluation();
      }
    });
    if (allFilled){
      //Shows "retry" and "show solution" buttons.
      if (self.params.enableShowSolution) {
        self.$showAnswersButton.show();
      }
      if (self.params.enableTryAgain) {
        self.$retryButton.show();
      }

      //Shows evaluation text
      self.showEvaluation();
    }
  };

  /**
   * Disables all draggables, user will not be able to interact with them any more.
   */
  C.prototype.disableDraggables = function () {
    this.draggablesArray.forEach( function (entry) {
      entry.disableDraggable();
    });
  };

  /**
   * Used for contracts.
   * Checks if the parent program can proceed. Always true.
   * @returns {Boolean} true
   */
  C.prototype.getAnswerGiven = function () {
    return true;
  };

  /**
   * Used for contracts.
   * Checks the current score for this task.
   * @returns {Number} The current score.
   */
  C.prototype.getScore = function () {
    this.calculateScore();
    return this.correctAnswers;
  };

  /**
   * Used for contracts.
   * Checks the maximum score for this task.
   * @returns {Number} The maximum score.
   */
  C.prototype.getMaxScore = function () {
    return this.droppablesArray.length;
  };

  /**
   * Used for contracts.
   * Sets feedback on the dropzones.
   */
  C.prototype.showSolutions = function () {
    this.droppablesArray.forEach( function (droppable) {
      droppable.setFeedback();
    });
  };

  /**
   * Private class for keeping track of draggable text.
   *
   * @param {String} text String that will be turned into a selectable word.
   * @param {jQuery} draggable Draggable object.
   */
  function Draggable(text, draggable) {
    var self = this;
    self.text = text;
    self.insideDropzone = null;
    self.$draggable = $(draggable);

    self.shortFormat = self.text;
    //Shortens the draggable string if inside a dropbox.
    if (self.shortFormat.length > 20) {
      self.shortFormat = self.shortFormat.slice(0,17)+'...';
    }

  }

  /**
   * Moves the draggable to the provided container.
   * @param {jQuery} $container Container the draggable will append to.
   */
  Draggable.prototype.appendDraggableTo = function ($container) {
    this.$draggable.detach().css({top: 0,left: 0}).appendTo($container);
  };

  /**
   * Disables the draggable, making it immovable.
   */
  Draggable.prototype.disableDraggable = function () {
    this.$draggable.draggable({ disabled: true});
  };

  /**
   * Gets the draggable jQuery object for this class.
   *
   * @returns {jQuery} Draggable item.
   */
  Draggable.prototype.getDraggableElement = function () {
    return this.$draggable;
  };

  /**
   * Removes this draggable from its dropzone, if it is contained in one.
   */
  Draggable.prototype.removeFromZone = function () {
    if (this.insideDropzone !== null) {
      this.insideDropzone.removeFeedback();
      this.insideDropzone.removeDraggable();
    }
    this.removeShortFormat();
    this.insideDropzone = null;
  };

  /**
   * Adds this draggable to the given dropzone.
   * @param {Droppable} droppable The droppable this draggable will be added to.
   */
  Draggable.prototype.addToZone = function (droppable) {
    if (this.insideDropzone !== null) {
      this.insideDropzone.removeDraggable();
    }
    this.insideDropzone = droppable;
    this.setShortFormat();
  };

  /**
   * Gets the answer text for this draggable.
   *
   * @returns {String} The answer text in this draggable.
   */
  Draggable.prototype.getAnswerText = function () {
    return this.text;
  };

  /**
   * Sets short format of draggable when inside a dropbox.
   */
  Draggable.prototype.setShortFormat = function () {
    this.$draggable.html(this.shortFormat);
  };

  /**
   * Removes the short format of draggable when it is outside a dropbox.
   */
  Draggable.prototype.removeShortFormat = function () {
    this.$draggable.html(this.text);
  };

  /**
   * Private class for keeping track of droppable zones.
   *
   * @param {String} text Correct text string for this drop box.
   * @param {undefined/String} tip Tip for this container, optional.
   * @param {jQuery} dropzone Dropzone object.
   * @param {jQuery} dropzoneContainer Container for the dropzone.
   */
  function Droppable(text, tip, dropzone, dropzoneContainer) {
    var self = this;
    self.text = text;
    self.tip = tip;
    self.containedDraggable = null;
    self.$dropzone = $(dropzone);
    self.$dropzoneContainer = $(dropzoneContainer);

    if(self.tip !== undefined) {
      self.$dropzone.append(H5P.JoubelUI.createTip(self.tip, self.$dropzone));
    }

    self.$showSolution = $('<div/>', {
      'class': SHOW_SOLUTION_CONTAINER,
      text: self.text
    }).appendTo(self.$dropzoneContainer).hide();
  }

  /**
   * Displays the solution next to the drop box.
   */
  Droppable.prototype.showSolution = function () {
    this.$showSolution.show();
  };

  /**
   * Hides the solution.
   */
  Droppable.prototype.hideSolution = function () {
    this.$showSolution.hide();
  };

  /**
   * Appends the droppable to the provided container.
   * @param {jQuery} $container Container which the dropzone will be appended to.
   */
  Droppable.prototype.appendDroppableTo = function ($container) {
    this.$dropzoneContainer.appendTo($container);
  };

  Droppable.prototype.appendInsideDroppableTo = function ($container) {
    if (this.containedDraggable !== null) {
      this.containedDraggable.appendDraggableTo($container);
    }
  };

  /**
   * Sets the contained draggable in this drop box to the provided argument.
   * @param {Draggable} droppedDraggable A draggable that has been dropped on this box.
   */
  Droppable.prototype.setDraggable = function(droppedDraggable) {
    var self = this;
    if (self.containedDraggable === droppedDraggable) {
      return;
    }
    if (self.containedDraggable !== null) {
      self.containedDraggable.removeFromZone();
    }
    self.containedDraggable = droppedDraggable;
    droppedDraggable.addToZone(self);
  };

  /**
   * Removes the contained draggable in this box.
   */
  Droppable.prototype.removeDraggable = function () {
    if (this.containedDraggable !== null) {
      this.containedDraggable = null;
    }
  };

  /**
   * Checks if this drop box contains the correct draggable.
   *
   * @returns {Boolean} True if this box has the correct answer.
   */
  Droppable.prototype.isCorrect = function () {
    if (this.containedDraggable === null) {
      return false;
    }
    return this.containedDraggable.getAnswerText() === this.text;
  };

  /**
   * Sets CSS styling feedback for this drop box.
   */
  Droppable.prototype.setFeedback = function () {
    //Draggable is correct
    if (this.isCorrect()) {
      this.$dropzone.removeClass(WRONG_FEEDBACK);
      this.$dropzone.addClass(CORRECT_FEEDBACK);
    }
    //Does not contain a draggable
    else if (this.containedDraggable === null) {
      this.$dropzone.removeClass(WRONG_FEEDBACK);
      this.$dropzone.removeClass(CORRECT_FEEDBACK);
    }
    //Draggable is wrong
    else {
      this.$dropzone.removeClass(CORRECT_FEEDBACK);
      this.$dropzone.addClass(WRONG_FEEDBACK);
    }
  };

  /**
   * Sets short format of draggable when inside a dropbox.
   */
  Droppable.prototype.setShortFormat = function () {
    if (this.containedDraggable !== null) {
      this.containedDraggable.setShortFormat();
    }
  };

  /**
   * Removes the short format of draggable when it is outside a dropbox.
   */
  Droppable.prototype.removeShortFormat = function () {
    if (this.containedDraggable !== null) {
      this.containedDraggable.removeShortFormat();
    }
  };

  /**
   * Removes all CSS styling feedback for this drop box.
   */
  Droppable.prototype.removeFeedback = function () {
    this.$dropzone.removeClass(WRONG_FEEDBACK);
    this.$dropzone.removeClass(CORRECT_FEEDBACK);
  };

  /**
   * Gets this object's dropzone jQuery object.
   *
   * @returns {jQuery} This object's dropzone.
   */
  Droppable.prototype.getDropzone = function () {
    return this.$dropzone;
  };

    return C;
})(H5P.jQuery);