!function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
}('rangeslide', this, function () {
	'use strict';
	
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
		rightLabel: "",
		showLabels: false,
		sideLabelsWidth: 40,
		showTrackMarkersProgress: false,
		showTicks: true,
		showTrackMarkers: false,
		showTrackProgress: false,
		showValue: false,
		startAlternateLabelsFromTop: false,
		startPosition: 0,
		stepSize: 1,
		thumbHeight: 16,
		thumbWidth: 16,
		tickHeight: 16,
		trackHeight: 7,
		valueIndicatorOffset: 5,
		valueIndicatorWidth: 30,
		valueIndicatorHeight: 30,
		valuePosition: "thumb",
		valueSource: "index"
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
			
			this.config = Object.assign({}, defaults, config);	
			
			this.__markersUpdateInterval;
			this.__value = this.getMarkerByIndex(this.config.startPosition || 0);
			this.__trackElement;
			this.__trackProgressElement;
			this.__trackMarkerElements;
			this.__sliderElement;
			this.__thumbElement;
			this.__valueElement;
			this.__labelContainerElement;
			this.__labelContainerElementTop;
			this.__labelContainerElementBottom;
			this.__rightLabelElement;
			this.__leftLabelElement;
			this.__mouseStartPositionX;
			this.__thumbStart;
			this.__playInterval;
			
			this.checkIfTargetIsValid(target);
			this.setAutoPlay(this.config.autoPlay);
			this.__targetElement.appendChild(this.createUI());
			var distanceOffset = this.config.thumbWidth;
			var distance = (this.__targetElement.clientWidth - distanceOffset) / ((this.config.data.length - 1) / this.config.stepSize);
			this.snap(distance * this.config.startPosition);
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
			this.__thumbElement = this.createThumbElement();
			this.__sliderElement = this.createSliderElement(this.__trackElement, this.__trackProgressElement, this.__thumbElement);
			
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
				this.__valueElement = this.createValueElement();
				this.__thumbElement.appendChild(this.__valueElement);
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
		
		
		createThumbElement: function() {
			var thumbElement = document.createElement("div");
			thumbElement.className = "thumb noselect";
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
		
		createSliderElement: function(trackElement, trackProgressElement, thumbElement) {
			var sliderElement = document.createElement("div");
			sliderElement.className = "slider noselect";
			sliderElement.appendChild(trackProgressElement);
			sliderElement.appendChild(trackElement);
			sliderElement.appendChild(thumbElement);
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
				span.innerText = this.config.data[i].name;
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
				markerElement.style.width = this.config.markerSize + "px";
				markerElement.style.height = this.config.markerSize + "px";
				markerElement.style.top = - this.config.markerSize / 2 + this.config.trackHeight / 2 + "px"
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
			return this.__value;
		},
		
		setValue: function(index) {
			var oldValue = this.__value; 
			this.__value = this.getMarkerByIndex(index);
			var distanceOffset = this.config.thumbWidth;
			var distance = (this.__targetElement.clientWidth - distanceOffset) / ((this.config.data.length - 1) / this.config.stepSize);
			this.snap(distance * index);
			this.onValueChanged(oldValue, this.__value);
		},
		
		setValueByName: function(name) {
			var oldValue = this.__value; 
			this.__value = this.getMarkerByName(name);
			var distanceOffset = this.config.thumbWidth;
			var distance = (this.__targetElement.clientWidth - distanceOffset) / ((this.config.data.length - 1) / this.config.stepSize);
			this.snap(distance * this.__value.index);
			this.onValueChanged(oldValue, this.__value);
		},
		
		setOption: function(name, value) {
			this.config[name] = value;
			this.refresh();
		},
		
		refresh: function() {
			this.init(this.__targetElement, this.config);
			this.fire("refreshed", [this.__targetElement]);
		},
		
		getElement: function() {
			return this.__targetElement;
		},
		
		getThumbStart: function() {
			return isNaN(parseFloat(this.__thumbElement.style.left)) ? 0 : parseFloat(this.__thumbElement.style.left);
		},
		
		setAutoPlay: function(value) {
			if(!value) {
				clearInterval(this.__playInterval);
				this.fire("playStop", [this.__value, this.__targetElement]);
				return;
			}
			this.__playInterval = setInterval(this.goToNextMarker.bind(this), this.config.autoPlayDelay);
			this.fire("playStart", [this.__value, this.__targetElement]);
		},
		
		goToNextMarker: function() {
			var nextMarker = this.getValue().index + 1;
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
		
		snap: function(positionX) {
			var distanceOffset = this.config.thumbWidth;
			var distance = (this.__targetElement.clientWidth - distanceOffset) / ((this.config.data.length - 1) / this.config.stepSize);
			this.__thumbElement.classList.add("animated");
			
			var progressToNextMarker = (positionX / distance) % 1;
			var nextMarker;
			var newLeft = "0px";
			if (progressToNextMarker < 0.5) {
				newLeft = (positionX - distance * progressToNextMarker).toFixed();
				this.__thumbElement.style.left = newLeft + "px";
				nextMarker = Math.floor(positionX / distance);
			}
			else {
				nextMarker = Math.floor(positionX / distance) + 1;
				if (nextMarker <= this.config.data.length - 1) {
					newLeft = (positionX + distance * (1 - progressToNextMarker)).toFixed();
					this.__thumbElement.style.left = newLeft + "px";
				}
				else {
					newLeft = (positionX - distance * (progressToNextMarker)).toFixed();
					this.__thumbElement.style.left = newLeft + "px";
					nextMarker = this.config.data.length - 1;
				}
			}
			
			if (this.config.showTrackProgress) {
				this.__trackProgressElement.style.width = newLeft + "px";
			}
			if (this.config.showTrackMarkersProgress) {
				this.__markersUpdateInterval = setInterval(this.onUpdateMarkersProgress, 50);
			}				

			this.__thumbElement.addEventListener("webkitTransitionEnd", this.onThumbTransitionEnd);
			this.__thumbElement.addEventListener("otransitionend", this.onThumbTransitionEnd);
			this.__thumbElement.addEventListener("oTransitionEnd", this.onThumbTransitionEnd);
			this.__thumbElement.addEventListener("msTransitionEnd", this.onThumbTransitionEnd);
			this.__thumbElement.addEventListener("transitionend", this.onThumbTransitionEnd);

			var nextValue = this.getMarkerByIndex(nextMarker);
			
			this.onValueChanged(this.__value, nextValue);
			this.__value = nextValue;
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
		
		onValueChanged: function(previousValue, currentValue) {
			if (this.config.showValue) {
				this.__valueElement.innerText = currentValue[this.config.valueSource];
			}
			if (this.config.highlightSelectedLabels) {
				this.setActiveLabel(currentValue.id);
			}
			this.fire("valueChanged", [currentValue, this.__targetElement]);
		},
		
		onTrackClicked: function(event) {
			this.snap(event.offsetX);
			this.fire("trackClicked", [this.__value, event.currentTarget]);
		},
		
		onLabelClicked: function(event) {
			this.snap(event.currentTarget.offsetLeft + this.config.labelsWidth / 2);
			this.fire("labelClicked", [this.__value, event.currentTarget]);
		},
		
		onMarkerClicked: function(event) {
			this.snap(event.currentTarget.offsetLeft + this.config.markerSize / 2);
			this.fire("markerClicked", [this.__value, event.currentTarget]);
			event.preventDefault();
			event.stopPropagation();
		},
		
		onThumbMouseDown: function(event) {
			this.__mouseStartPositionX = event.pageX;
			this.__thumbStart = this.getThumbStart();
			this.fire("thumbDragStart", [this.__value, event.currentTarget]);
			window.addEventListener("mousemove", this.onThumbMouseMove);
			window.addEventListener("mouseup", this.onThumbMouseUp);
		},
		
		onThumbMouseUp: function(event) {
			this.__thumbStart = this.getThumbStart();
			this.snap(this.__thumbStart);
			this.fire("thumbDragEnd", [this.__value, event.currentTarget]);
			window.removeEventListener("mousemove", this.onThumbMouseMove);
			window.removeEventListener("mouseup", this.onThumbMouseUp);
		},
		
		onThumbMouseMove: function(event) {
			var difference = - 1 * (this.__mouseStartPositionX - event.pageX);
			var newLeft = this.__thumbStart + difference;
			
			if(!this.isPositionOutOfBounds(newLeft)) {
				this.__thumbElement.style.left = newLeft + 'px';
			}
			this.fire("thumbDragged", [this.__value, event.currentTarget]);
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
			var l = this.__trackMarkerElements.length;
			while (l--) {
				if (this.__trackMarkerElements[l].offsetLeft <= this.__thumbElement.offsetLeft) {
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
		
		getMarkerByIndex: function(index) {
			return {
				index: index,
				name: this.config.data[index].name,
				item: this.config.data[index].item
			};
		},
		
		getMarkerByName: function(name) {
			for (var i = 0; i < this.config.data.length; i++) {
				if (this.config.data[i].name === name) {
					return {
						index: i,
						name: this.config.data[i].name,
						item: this.config.data[i].item
					};
				}
			}
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
	
});