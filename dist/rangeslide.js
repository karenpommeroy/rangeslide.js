(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define([], function () {
      return (factory());
    });
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    root['rangeslide'] = factory();
  }
}(this, function () {

    "use strict";
	
    var MAX_THUMB_CLASS = "max-thumb",
        MIN_THUMB_CLASS = "min-thumb";
    
	var defaults = {
		autoPlay: false,
		autoPlayDelay: 1000,
		data: [],
		enableLabelClick: true,
		enableMarkerClick: true,
		enableTrackClick: true,
		handlers: [],
		highlightSelectedLabels: false,
		labelsPosition: "below",
		labelsWidth: 60,
		leftLabel: "",
		loop: true,
		markerSize: 14,
        mode: "single",
		rightLabel: "",
		showLabels: false,
		showTrackMarkersProgress: false,
		showTicks: true,
		showTrackMarkers: false,
		showTrackProgress: false,
		showValue: false,
        sideLabelsWidth: 40,
		startAlternateLabelsFromTop: false,
		startPosition: 0,
        endPosition: Infinity,
		stepSize: 1,
		thumbHeight: 16,
		thumbWidth: 16,
		tickHeight: 16,
		trackHeight: 7,
		valueIndicatorOffset: 5,
		valueIndicatorWidth: 30,
		valueIndicatorHeight: 30,
		valuePosition: "above",
		valueSource: "index"
	};
    
    function Thumb (value) {
        this.__value = value;
        this.__element;
        this.__label;
    };
    
    Thumb.prototype = {        
        getElement: function () {
            return this.__element;
        },
        
        getLabel: function () {
            return this.__label;
        },
        
        getValue: function () {
            return this.__value;
        },
        
        getRight: function () {
            return this.__element && this.__element.offsetLeft + this.__element.offsetWidth;
        },
        
        getLeft: function () {
            return this.__element && this.__element.offsetLeft;
        },
        
        setLeft: function (left) {
            this.__element.style.left = left + "px";
        },
        
        setElement: function (element) {
            this.__element = element;
        },
        
        setValue: function (value) {
            this.__value = value;
        },
        
        addLabel: function (label) {
            this.__label = label;
            this.__element && this.__element.appendChild(label);
        },
        
        hide: function () {
            if (!this.__element) return;
            
            this.__element.style.display = "none";
        }
    };
		
	function Rangeslide() {
		this.init.apply(this, arguments)
	};
	
	Rangeslide.prototype = {
		
		init: function (target, config) {
			this.onThumbMouseMove = this.onThumbMouseMove.bind(this);
			this.onThumbMouseUp = this.onThumbMouseUp.bind(this);
			this.onThumbMouseDown = this.onThumbMouseDown.bind(this);
			this.onTrackClicked = this.onTrackClicked.bind(this);
			this.onLabelClicked = this.onLabelClicked.bind(this);
			this.onMarkerClicked = this.onMarkerClicked.bind(this);
			this.onThumbTransitionEnd = this.onThumbTransitionEnd.bind(this);
			this.onUpdateMarkersProgress = this.onUpdateMarkersProgress.bind(this);
			
			this.config = Object.assign({}, defaults, config)
            this.__adjustConfiguration();
			this.__multiThumbProximityBuffor = 1.5;
			this.__markersUpdateInterval;
			this.__trackElement;
			this.__trackProgressElement;
			this.__trackMarkerElements;
			this.__sliderElement;
            this.__draggedThumb;
			this.__labelContainerElement;
			this.__labelContainerElementTop;
			this.__labelContainerElementBottom;
			this.__rightLabelElement;
			this.__leftLabelElement;
			this.__mouseStartPositionX;
			this.__playInterval;
            this.__thumbLeft = new Thumb(this.getMarkerByIndex(this.config.startPosition));
            this.__thumbRight = new Thumb(this.getMarkerByIndex(this.config.endPosition));
			this.checkIfTargetIsValid(target);
			this.setAutoPlay(this.config.autoPlay);
			this.__targetElement.appendChild(this.createUI());
			this.__setThumbsInitialPositions();
			this.fire("initialized", [this.__targetElement]);
		},
		
		checkIfTargetIsValid: function(target) {
			if (!target) {
				throw new Error("Missing required attribute: target element (css selector or DOM node) must be provided");
			}
			else if (this.__isString(target)) {
				this.__targetElement = document.querySelector(target);
			}
			else if (this.__isDOMElement(target)) {
				this.__targetElement = target;
			}
			else {
				throw new Error("Incorrect type: target element must be DOM node or string css selector");
			}
		},
		
		createUI: function() {
			var fragment = document.createDocumentFragment();
			this.__trackElement = this.createTrackElement();
			this.__trackProgressElement = this.createTrackProgressElement();
			this.__thumbLeft.setElement(this.createThumbElement(MIN_THUMB_CLASS));
            this.isRangeMode() && this.__thumbRight.setElement(this.createThumbElement(MAX_THUMB_CLASS));
           
			this.__sliderElement = this.createSliderElement(this.__trackElement, this.__trackProgressElement, [
                this.__thumbLeft.getElement(),
                this.__thumbRight.getElement()
            ]);
			
			fragment.appendChild(this.__sliderElement);
			
			if (this.config.showLabels) {
				if (this.config.labelsPosition === "above") {
					this.__labelContainerElement = this.createLabelsElement();
					this.createLabels(this.__labelContainerElement, false, false, true);
					fragment.insertBefore(this.__labelContainerElement, this.__sliderElement);
				}
				else if (this.config.labelsPosition === "alternate") {
					this.__labelContainerElementTop = this.createLabelsElement();
					this.createLabels(this.__labelContainerElementTop, true, !this.config.startAlternateLabelsFromTop, true);
					this.__labelContainerElementBottom = this.createLabelsElement();
					this.createLabels(this.__labelContainerElementBottom, true, this.config.startAlternateLabelsFromTop, false);
					fragment.insertBefore(this.__labelContainerElementTop,this.__sliderElement);
					fragment.appendChild(this.__labelContainerElementBottom);
				}
				else {
					this.__labelContainerElement = this.createLabelsElement();
					this.createLabels(this.__labelContainerElement, false, false, false);
					fragment.appendChild(this.__labelContainerElement);
				}
			}
			
			if (this.config.showValue) {
				this.__thumbLeft.addLabel(this.createValueElement());
                this.isRangeMode() && this.__thumbRight.addLabel(this.createValueElement());
			}
			
			if (this.config.leftLabel) {
				this.__leftLabelElement = this.createSideLabel(this.config.leftLabel);
				fragment.appendChild(this.__leftLabelElement);
				this.__leftLabelElement.style.left = - this.config.sideLabelsWidth + "px";
			}
			
			if (this.config.rightLabel) {
				this.__rightLabelElement = this.createSideLabel(this.config.rightLabel);
				fragment.appendChild(this.__rightLabelElement);
				this.__rightLabelElement.style.right = - this.config.sideLabelsWidth + "px"
			}
			
			if (this.config.showTrackMarkers) {
				this.__trackMarkerElements = this.createTrackMarkers();
				var l = this.__trackMarkerElements.length;
				while (l--) {
					this.__trackElement.appendChild(this.__trackMarkerElements[l]);
				}
			}
            if (this.isSelectMode()) {
                this.__thumbLeft.hide();
                this.__thumbRight.hide();
            }
			return fragment;
		},
		
		createTrackElement: function() {
			var trackElement = document.createElement("div");
			trackElement.className = "track noselect animated";
			trackElement.style.height = this.config.trackHeight + "px";
			if (this.config.enableTrackClick) {
				trackElement.onclick = this.onTrackClicked;
			}
			return trackElement; 
		},
		
		createTrackProgressElement: function() {
			var trackProgressElement = document.createElement("div");
			trackProgressElement.className = "track-progress noselect";
			trackProgressElement.style.height = this.config.trackHeight + "px";
			return trackProgressElement; 
		},
		
		createThumbElement: function(className) {
			var thumbElement = document.createElement("div");
			thumbElement.className = "thumb noselect " + className;
			thumbElement.style.width = this.config.thumbWidth + "px";
			thumbElement.style.marginTop = - this.config.thumbHeight / 2 - this.config.trackHeight / 2 + "px";
			thumbElement.style.height = this.config.thumbHeight + "px";
			thumbElement.onmousedown = this.onThumbMouseDown;
			return thumbElement; 
		},
		
		createSideLabel: function(labelText) {
			var labelElement = document.createElement("div");
			labelElement.innerText = labelText;
			labelElement.className = "side-label noselect";
			labelElement.style.width = this.config.sideLabelsWidth + "px";
			return labelElement;
		},
		
		createSliderElement: function(trackElement, trackProgressElement, thumbElements) {
			var sliderElement = document.createElement("div");
			var l = thumbElements.length;
            sliderElement.className = "slider noselect";
			sliderElement.appendChild(trackProgressElement);
			sliderElement.appendChild(trackElement);
            while (l--) {
                thumbElements[l] && sliderElement.appendChild(thumbElements[l]);
			}
            return sliderElement;
		},
		
		createValueElement: function() {
			var valueElement = document.createElement("div");
			valueElement.className = "value-indicator noselect";
			if (this.config.valuePosition === "thumb") {
				valueElement.style.width = this.config.thumbWidth + "px";
				valueElement.style.height = this.config.thumbHeight + "px";
				valueElement.style.lineHeight = this.config.thumbHeight + "px";
			}
			else {
				valueElement.style.width = this.config.valueIndicatorWidth + "px";
				valueElement.style.height = this.config.valueIndicatorHeight + "px";
				valueElement.style.lineHeight = this.config.valueIndicatorHeight + "px";
				valueElement.style.left = - this.config.valueIndicatorWidth / 2 + this.config.thumbWidth / 2 + "px";
			}
			
			if (this.config.valuePosition === "above") {
				valueElement.style.top = - this.config.valueIndicatorHeight / 2 - this.config.thumbHeight / 2 - this.config.trackHeight - this.config.valueIndicatorOffset + "px";
				valueElement.classList.add("above");
			}
			else if (this.config.valuePosition === "below") {
				valueElement.style.top = this.config.valueIndicatorHeight / 2 + this.config.thumbHeight / 2 - this.config.trackHeight / 2 + this.config.valueIndicatorOffset + "px";
				valueElement.classList.add("below");
			}
			return valueElement;
		},
		
		createLabelsElement: function() {
			var labelsElement = document.createElement("div");
			labelsElement.className = "labels-container noselect";
			return labelsElement;
		},
		
		createLabels: function (parent, everyOtherLabel, skipFirst, labelsBeforeTicks) {
			var labelOffset = this.config.labelsWidth / (everyOtherLabel ? 1 : 2) - this.config.thumbWidth / 2;
			var distanceOffset = this.config.thumbWidth;
			var total = this.config.data.length - 1;
			var half = total / 2;
			var distance = "((100% - " + distanceOffset + "px) / " + total + ")";
			
			for (var i = skipFirst ? 1 : 0; i <= total; everyOtherLabel ? i += 2 : i++) {				
				var labelElement = document.createElement("div");
				labelElement.className = "tick-label noselect";
				labelElement.style.width = this.config.labelsWidth * (everyOtherLabel ? 2 : 1) + "px";
				labelElement.id = this.__targetElement.id + "_label" + i;
				
				if (this.config.enableLabelClick) {
					labelElement.onclick = this.onLabelClicked;
				}
				
				labelElement.style.left = "calc(" + distance + " * " + i + " - " + labelOffset + "px)";
				
				if (this.config.showTicks) {
					var tickElement = document.createElement("div");
					tickElement.className = "tick noselect";
					tickElement.style.height = this.config.tickHeight + "px";
					labelElement.appendChild(tickElement);
				}
				var span = document.createElement("span");
				span.className = "noselect";
				span.innerText = this.config.data[i][this.config.valueSource];
				if (labelsBeforeTicks) {
					labelElement.insertBefore(span, tickElement);
				}
				else {
					labelElement.appendChild(span);
				}
				
				parent.appendChild(labelElement);
			}
			if (labelsBeforeTicks) {
				parent.style.height = 14 + (this.config.showTicks ? this.config.tickHeight : 0) + "px";
			}
		},
		
		createTrackMarkers: function () {
			var markerOffset = this.config.markerSize / 2 - this.config.thumbWidth / 2;
			var distanceOffset = this.config.thumbWidth;
			var total = this.config.data.length - 1;
			var l = this.config.data.length;
			var half = total / 2;
			var distance = "((100% - " + distanceOffset + "px) / " + total + ")";
			var markers = [];
			
			while (l--) {				
				var markerElement = document.createElement("div");
				markerElement.className = "track-marker noselect";
                markerElement.dataset.id = l;
				markerElement.style.width = this.config.markerSize + "px";
				markerElement.style.height = this.config.markerSize + "px";
				markerElement.style.top = - this.config.markerSize / 2 + this.config.trackHeight / 2 + "px";
				if (this.config.enableMarkerClick) {
					markerElement.onclick = this.onMarkerClicked;
					markerElement.style.cursor = "pointer";
				}
				
				markerElement.style.left = "calc(" + distance + " * " + l + " - " + markerOffset + "px)";
				markers.push(markerElement);
			}
			
			return markers;
		},
		
		getValue: function() {
            if (this.isRangeMode()) return this.getRange();
            else if (this.isSelectMode()) return this.getSelection();
            else return this.__thumbLeft.getValue();
		},
        
        getMinValue: function() {
			return this.__thumbLeft.getValue();
		},
        
        getMaxValue: function() {
			return this.__thumbRight.getValue();
		},
        
        getRange: function() {
			var start = this.__thumbLeft.getValue().index,
                end = this.__thumbRight.getValue().index,
                result = [];
                
            for (var i = start; i <= end; i++) {
                result.push(this.getMarkerByIndex(i));
            }
            
            return result;
		},
        
        getSelection: function() {
            var selectedElements = this.__targetElement.querySelectorAll(".track-marker.selected"),
                selectSet = [];
            
            for (var i = 0; i < selectedElements.length; i++) {
                selectSet.push(this.config.data[selectedElements[i].dataset.id]);
            }
            
            return selectSet;
        },
		
		setValue: function(index, thumb) {
			var oldValue = thumb.getValue(); 
			thumb.setValue(this.getMarkerByIndex(index));
			var distanceOffset = this.config.thumbWidth;
			var distance = (this.__targetElement.clientWidth - distanceOffset) / ((this.config.data.length - 1) / this.config.stepSize);
			this.snap(distance * index);
			this.onValueChanged(oldValue, thumb.getValue(), thumb);
		},
        
        setMinValue: function(index) {
			this.setValue(index, this.__thumbLeft);
		},
        
        setMaxValue: function(index) {
			this.setValue(index, this.__thumbRight);
		},
		
		setOption: function(name, value) {
			this.config[name] = value;
			this.refresh();
		},
        
        isRangeMode: function() {
            return this.config.mode === "range";
        },
        
        isSelectMode: function() {
            return this.config.mode === "select";
        },
		
		refresh: function() {
			this.init(this.__targetElement, this.config);
			this.fire("refreshed", [this.__targetElement]);
		},
		
		getElement: function() {
			return this.__targetElement;
		},
		
		getThumbStart: function(thumbElement) {
			return isNaN(parseFloat(thumbElement.style.left)) ? 0 : parseFloat(thumbElement.style.left);
		},
		
		setAutoPlay: function(value) {
			if (this.isRangeMode()) return;
            
            if(!value) {
				clearInterval(this.__playInterval);
				this.fire("playStop", [this.__thumbLeft.getValue(), this.__targetElement]);
				return;
			}
			this.__playInterval = setInterval(this.goToNextMarker.bind(this), this.config.autoPlayDelay);
			this.fire("playStart", [this.__thumbLeft.getValue(), this.__targetElement]);
		},
        
        select: function (element) {
            element.classList.toggle("selected");
        },
		
		goToNextMarker: function() {
			if (this.isRangeMode()) return;
            
            var nextMarker = this.__thumbLeft.getValue().index + 1;
			if (this.config.loop) {
				if (nextMarker > this.config.data.length - 1) {
					nextMarker = 0;
				}
			}
			else {
				if (nextMarker > this.config.data.length - 1) {
					clearInterval(this.__playInterval);
					return;
				}
			}
			this.setValue(nextMarker);
		},
        
        getClosestThumbElement: function (positionX) {
            var leftDistance = Math.abs(this.__thumbLeft.getRight() - positionX),
                rightDistance = Math.abs(this.__thumbRight.getLeft() - positionX);
                
            return leftDistance > rightDistance ? this.__thumbRight : this.__thumbLeft;
        },
		
		snap: function(positionX, thumb, disableAnimation) {
			var distanceOffset = this.config.thumbWidth;
			var distance = (this.__targetElement.clientWidth - distanceOffset) / ((this.config.data.length - 1) / this.config.stepSize);
			var closestThumbElement = this.isRangeMode() ? thumb || this.getClosestThumbElement(positionX) : this.__thumbLeft;
            
            !disableAnimation && closestThumbElement.getElement().classList.add("animated");
			
			var progressToNextMarker = (positionX / distance) % 1;
			var nextMarker;
			var newLeft = "0px";
			if (progressToNextMarker < 0.5) {
				newLeft = (positionX - distance * progressToNextMarker).toFixed();
				closestThumbElement.setLeft(newLeft);
				nextMarker = Math.floor(positionX / distance);
			}
			else {
				nextMarker = Math.floor(positionX / distance) + 1;
				if (nextMarker <= this.config.data.length - 1) {
					newLeft = (positionX + distance * (1 - progressToNextMarker)).toFixed();
					closestThumbElement.setLeft(newLeft);
				}
				else {
					newLeft = (positionX - distance * (progressToNextMarker)).toFixed();
					closestThumbElement.setLeft(newLeft);
					nextMarker = this.config.data.length - 1;
				}
			}
			
			if (this.config.showTrackProgress) {
				if (this.isRangeMode()) {
                    if (closestThumbElement.getElement().classList.contains(MAX_THUMB_CLASS)) {
                        this.__trackProgressElement.style.left = this.__thumbLeft.getLeft();
                        this.__trackProgressElement.style.width = (newLeft - this.__thumbLeft.getLeft()) + "px";
                    }
                    else if (closestThumbElement.getElement().classList.contains(MIN_THUMB_CLASS)) {
                        this.__trackProgressElement.style.left = newLeft + "px";
                        this.__trackProgressElement.style.width = (this.__thumbRight.getLeft() - newLeft) + "px";
                    }
                }
                else {
                    this.__trackProgressElement.style.width = newLeft + "px";
                }
			}
			if (this.config.showTrackMarkersProgress) {
				clearInterval(this.__markersUpdateInterval);
                this.__markersUpdateInterval = setInterval(this.onUpdateMarkersProgress, 50);
			}				

			closestThumbElement.getElement().addEventListener("webkitTransitionEnd", this.onThumbTransitionEnd);
			closestThumbElement.getElement().addEventListener("otransitionend", this.onThumbTransitionEnd);
			closestThumbElement.getElement().addEventListener("oTransitionEnd", this.onThumbTransitionEnd);
			closestThumbElement.getElement().addEventListener("msTransitionEnd", this.onThumbTransitionEnd);
			closestThumbElement.getElement().addEventListener("transitionend", this.onThumbTransitionEnd);
            
			var nextValue = this.getMarkerByIndex(nextMarker);
			
			this.onValueChanged(closestThumbElement.getValue(), nextValue, closestThumbElement);
			closestThumbElement.setValue(nextValue);
		},
		
		setActiveLabel: function (index) {
			var previouslyActiveLabel = this.__targetElement.querySelector(".tick-label.selected");
			var currentlyActiveLabel = this.__targetElement.querySelector("#" + this.__targetElement.id + "_label" + index);
			if (previouslyActiveLabel) {
				previouslyActiveLabel.classList.remove("selected");
			}
			if (currentlyActiveLabel) {
				currentlyActiveLabel.classList.add("selected");
			}
		},
		
		onValueChanged: function(previousValue, currentValue, thumb) {
			if (this.config.showValue) {
				thumb.getLabel().innerText = currentValue[this.config.valueSource];
			}
			if (this.config.highlightSelectedLabels) {
				this.setActiveLabel(currentValue.index);
			}
			this.fire("valueChanged", [currentValue, this.__targetElement]);
		},
		
		onTrackClicked: function(event) {
			this.snap(event.offsetX);
			this.fire("trackClicked", [this.__thumbLeft.getValue(), event.currentTarget]);
		},
		
		onLabelClicked: function(event) {
			this.snap(event.currentTarget.offsetLeft + this.config.labelsWidth / 2);
			this.fire("labelClicked", [this.__thumbLeft.getValue(), event.currentTarget]);
		},
		
		onMarkerClicked: function(event) {
			if(this.isSelectMode()) {
                this.select(event.currentTarget);
            }
            else {
                this.snap(event.currentTarget.offsetLeft + this.config.markerSize / 2);
            }
			this.fire("markerClicked", [this.__thumbLeft.getValue(), event.currentTarget]);
			event.preventDefault();
			event.stopPropagation();
		},
		
		onThumbMouseDown: function(event) {
			this.__mouseStartPositionX = event.pageX;
			var thumb = this.__getThumbFromElement(event.currentTarget);
            this.__draggedThumb = thumb;
            thumb.start = this.getThumbStart(event.currentTarget);
			this.fire("thumbDragStart", [thumb.getValue(), event.currentTarget]);
			window.addEventListener("mousemove", this.onThumbMouseMove);
			window.addEventListener("mouseup", this.onThumbMouseUp);
		},
		
		onThumbMouseUp: function(event) {
            var thumb = this.__draggedThumb;
            thumb.start = this.getThumbStart(thumb.getElement());
			this.snap(thumb.start);
			this.fire("thumbDragEnd", [thumb.getValue(), thumb.getElement()]);
            this.__draggedThumb = null;
			window.removeEventListener("mousemove", this.onThumbMouseMove);
			window.removeEventListener("mouseup", this.onThumbMouseUp);
		},
		
		onThumbMouseMove: function(event) {
            var thumb = this.__draggedThumb;
            var difference = - 1 * (this.__mouseStartPositionX - event.pageX);
			var newLeft = thumb.start + difference;
            if(this.isRangeMode() && this.areThumbsTooClose()) { 
                if (thumb.getElement().classList.contains(MAX_THUMB_CLASS)) {
                    if (newLeft < thumb.getLeft()) return;
                }
                else if (thumb.getElement().classList.contains(MIN_THUMB_CLASS)) {
                    if (newLeft > thumb.getLeft()) return;
                }
            }
			
			if(!this.isPositionOutOfBounds(newLeft)) {
				thumb.setLeft(newLeft);
			}
			this.fire("thumbDragged", [thumb.getValue(), thumb.getElement()]);
		},
		
		onThumbTransitionEnd: function(event) {
			event.target.removeEventListener(event.type, this.onThumbTransitionEnd);
			event.target.classList.remove("animated");
			if (this.config.showTrackMarkersProgress) {
				this.onUpdateMarkersProgress();
			}
			clearInterval(this.__markersUpdateInterval);
		},
		
		onUpdateMarkersProgress: function() {
			this.isRangeMode() ? this.__updateMarkerRange() : this.__updateMarkerProgress();
		},
        
        __adjustConfiguration: function () {
            var total = this.config.data.length - 1;
            this.config.endPosition = this.config.endPosition > total ? total : this.config.endPosition;
            if (this.isRangeMode()) {
                this.config.autoPlay = false;
                this.config.loop = false;
            }
            else if (this.isSelectMode()) {
                this.config.showTrackMarkers = true;
            }
        },
        
        __getThumbFromElement: function (element) {
            if (element.classList.contains(MAX_THUMB_CLASS)) {
                return this.__thumbRight;
            }
            else if (element.classList.contains(MIN_THUMB_CLASS)) {
                return this.__thumbLeft;
            }
        },
        
        __setThumbsInitialPositions: function () {
            var distanceOffset = this.config.thumbWidth;
			var distance = (this.__targetElement.clientWidth - distanceOffset) / ((this.config.data.length - 1) / this.config.stepSize);
			this.snap(distance * this.config.startPosition, this.__thumbLeft, true);
            if (this.isRangeMode()) {
                this.snap(distance * this.config.endPosition, this.__thumbRight, true);
            }
        },
        
        __updateMarkerProgress: function() {
            var l = this.__trackMarkerElements.length;
            while (l--) {
                if (this.__trackMarkerElements[l].offsetLeft <= this.__thumbLeft.getLeft()) {
                    this.__trackMarkerElements[l].classList.add("completed");
                }
                else {
                    this.__trackMarkerElements[l].classList.remove("completed");
                }
            }
        },
        
        __updateMarkerRange: function() {
            var l = this.__trackMarkerElements.length;
            while (l--) {
                if (this.__trackMarkerElements[l].offsetLeft >= this.__thumbLeft.getLeft() && this.__trackMarkerElements[l].offsetLeft <= this.__thumbRight.getRight()) {
                    this.__trackMarkerElements[l].classList.add("completed");
                }
                else {
                    this.__trackMarkerElements[l].classList.remove("completed");
                }
            }
        },
		
		isPositionOutOfBounds: function(position) {
			var size = this.config.data.length - 1;
			var distanceBetweenLabels = (this.__targetElement.clientWidth - this.config.thumbWidth) / size;
			return (position > distanceBetweenLabels * size) || (position < 0);
		},
        
        areThumbsTooClose: function(position) {
            var size = this.config.data.length - 1;
			var distanceBetweenLabels = (this.__targetElement.clientWidth - this.config.thumbWidth) / size;
			var distanceBetweenThumbs = this.__thumbRight.getLeft() - this.__thumbLeft.getRight();
            
            return distanceBetweenThumbs < distanceBetweenLabels / this.__multiThumbProximityBuffor;
		},
		
		getMarkerByIndex: function(index) {
			return {
				index: index,
				data: this.config.data[index]
			};
		},
		
		fire: function(eventName, args) {
			if (!this.config.handlers || !this.config.handlers[eventName]) {
				return;
			}
			var l = this.config.handlers[eventName].length;
			while (l--) {
				this.config.handlers[eventName][l].apply(this, args);
			}
		},
		
		__isDOMElement: function (target) {
			return target instanceof Element;
		},
		
		__isString: function (target) {
			return typeof target === "string";
		}
	};
	
	function rangeslide(target, config) {
		return new Rangeslide(target, config);
	}
	
	return rangeslide;

}));
