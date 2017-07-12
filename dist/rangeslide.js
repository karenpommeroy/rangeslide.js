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
    MIN_THUMB_CLASS = "min-thumb",
    RANGESLIDE_CLASS = "rangeslide";

var defaults = {
    autoPlay: false,
    autoPlayDelay: 1000,
    data: [],
    dataSource: "value",
    animations: true,
    enableLabelClick: true,
    enableMarkerClick: true,
    enableTrackClick: true,
    endPosition: Infinity,
    handlers: [],
    highlightSelectedLabels: false,
    labelsPosition: "below",
    labelsContent: "value",
    labelsWidth: 60,
    leftLabel: "",
    loop: true,
    markerSize: 14,
    mode: "single",
    mouseWheel: false,
    rightLabel: "",
    showLabels: false,
    showTrackMarkersProgress: false,
    showTicks: true,
    showTooltips: false,
    showTrackMarkers: false,
    showTrackProgress: false,
    showValue: false,
    sideLabelsWidth: 40,
    slideMode: "snap",
    spacing: "equidistant",
    startAlternateLabelsFromTop: false,
    startPosition: 0,
    stepSize: 1,
    thumbHeight: 16,
    thumbWidth: 16,
    tickHeight: 16,
    tooltipsContent: "value",
    trackHeight: 7,
    valueIndicatorOffset: 5,
    valueIndicatorWidth: 50,
    valueIndicatorHeight: 30,
    valueIndicatorPosition: "above",
    valueIndicatorContent: "value"
};

function Thumb (value, index) {
    this.__value = value;
    this.__element;
    this.__label;
    this.__index = index;
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
    
    getIndex: function () {
        return this.__index;
    },
    
    setIndex: function (index) {
        this.__index = index;
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
    this.init.apply(this, arguments);
    this.fire("initialized", [this.__targetElement]);
};

Rangeslide.prototype = {
    
    init: function (target, config) {
        this.__onThumbMouseMove = this.__onThumbMouseMove.bind(this);
        this.__onThumbMouseUp = this.__onThumbMouseUp.bind(this);
        this.__onThumbMouseDown = this.__onThumbMouseDown.bind(this);
        this.__onTrackClicked = this.__onTrackClicked.bind(this);
        this.__onLabelClicked = this.__onLabelClicked.bind(this);
        this.__onMarkerClicked = this.__onMarkerClicked.bind(this);
        this.__onThumbTransitionEnd = this.__onThumbTransitionEnd.bind(this);
        this.__onUpdateMarkersProgress = this.__onUpdateMarkersProgress.bind(this);
        this.__onMouseWheel = this.__onMouseWheel.bind(this);
        
        this.config = Object.assign({}, defaults, config)
        this.__valuesStore = {};
        this.__adjustConfiguration(config);
        this.__minimalDistanceBetweenThumbs = 5;
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
        this.__thumbLeft = new Thumb(this.getMarkerByIndex(this.config.startPosition), this.config.startPosition);
        this.__thumbRight = new Thumb(this.getMarkerByIndex(this.config.endPosition), this.config.endPosition);
        this.__previousValue;
        
        this.__checkIfTargetIsValid(target);
        this.__setAutoPlay(this.config.autoPlay);
        this.__targetElement.classList.add(RANGESLIDE_CLASS);
        this.__targetElement.appendChild(this.__createUI());
        this.__setThumbsInitialPositions();
        
        if (this.config.mouseWheel) {
            this.__attachMouseWheelHandlers();
        }
    },
    
    refresh: function() {
        this.__storeValues();
        this.destroy();
        this.__thumbLeft = new Thumb(this.getMarkerByIndex(this.config.startPosition), this.config.startPosition);
        this.__thumbRight = new Thumb(this.getMarkerByIndex(this.config.endPosition), this.config.endPosition);
        this.__setAutoPlay(this.config.autoPlay);
        this.__targetElement.appendChild(this.__createUI());
        this.__loadStoredValues();
        this.setMinValueByIndex(this.__thumbLeft.getIndex());
        this.setMaxValueByIndex(this.__thumbRight.getIndex());
        this.fire("refreshed", [this.__targetElement]);
    },
    
    destroy: function() {
        clearInterval(this.__markersUpdateInterval);
        clearInterval(this.__playInterval);
        this.__detachMouseWheelHandlers();
        
        while (this.__targetElement.lastChild) {
            this.__targetElement.removeChild(this.__targetElement.lastChild);
        }
        
        this.fire("destroyed", [this.__targetElement]);
    },
    
    getElement: function() {
        return this.__targetElement;
    },
    
    getValue: function() {
        if (this.isRangeMode()) return this.getRange();
        else if (this.isSelectMode()) return this.getSelection();
        else return this.__thumbLeft.getValue();
    },
    
    getMinValue: function() {
        if (this.isSelectMode()) return null;
        return this.__thumbLeft.getValue();
    },
    
    getMaxValue: function() {
        if (this.isSingleMode()) return this.__thumbLeft.getValue();
        else if (this.isSelectMode()) return null;
        
        return this.__thumbRight.getValue();
    },
    
    getRange: function() {
        if (this.isSingleMode() || this.isSelectMode()) return [];

        return [this.__thumbLeft.getValue(), this.__thumbRight.getValue()];
    },
    
    getSelection: function() {
        if (this.isSingleMode() || this.isRangeMode()) return [];
        
        var selectedElements = this.__targetElement.querySelectorAll(".track-marker.selected"),
            selectSet = [];
        
        for (var i = 0; i < selectedElements.length; i++) {
            selectSet.push(this.config.data[parseInt(selectedElements[i].dataset.index)]);
        }
        
        return selectSet;
    },
    
    setValue: function(value, thumb) {
        var oldValue = thumb.getValue(); 
        var offset = this.__getPositionFromValue(value);
        thumb.setValue(value);
        this.__snap(offset);
        this.__onValueChanged(oldValue, thumb.getValue(), thumb);
    },
    
    
    setMinValue: function(value) {
        if (this.isSelectMode()) return;
        
        this.setValue(value, this.__thumbLeft);
    },
    
    setMaxValue: function(value) {
        if (this.isSingleMode()) return this.setValue(value, this.__thumbLeft);
        else if (this.isSelectMode()) return;
        
        this.setValue(value, this.__thumbRight);
    },
    
    setValueByIndex: function(index, thumb) {
        if (index < 0 || index > this.config.data.length -1) return;
        
        var oldValue = thumb.getValue(); 
        thumb.setValue(this.getMarkerByIndex(index));
        thumb.setIndex(index);
        var distanceOffset = this.config.thumbWidth;
        var distance = (this.__targetElement.clientWidth - distanceOffset) / ((this.config.data.length - 1) / this.config.stepSize);
        this.__snap(distance * index, thumb);
        this.__onValueChanged(oldValue, thumb.getValue(), thumb);
    },
    
    setValueByAttribute: function(attributeName, attributeValue) {
        var l = this.config.data.length;
        while (l--) {
            if (this.config.data[l][attributeName] === attributeValue) {
                break;
            }
        }
        this.setValueByIndex(l - 1, this.__thumbLeft);
    },
    
    setMinValueByIndex: function(index) {
        if (this.isSelectMode()) return;
        if (index < 0) return;

        this.setValueByIndex(index, this.__thumbLeft);
    },
    
    setMaxValueByIndex: function(index) {
        if (this.isSingleMode()) return this.setValueByIndex(index, this.__thumbLeft);
        if (this.isSelectMode()) return;
        if (index > this.config.data.length -1) return;
        
        this.setValueByIndex(index, this.__thumbRight);
    },
    
    setMinValueByAttribute: function (attributeName, attributeValue) {
        if (this.isSelectMode()) return;
        var l = this.config.data.length;
        while (l--) {
            if (this.config.data[l][attributeName] === attributeValue) {
                break;
            }
        }
        this.setMinValueByIndex(l - 1, this.__thumbLeft);
    },
    
    setMaxValueByAttribute: function (attributeName, attributeValue) {
        if (this.isSelectMode()) return;
        var l = this.config.data.length;
        while (l--) {
            if (this.config.data[l][attributeName] === attributeValue) {
                break;
            }
        }
        if (this.isSingleMode()) return this.setValueByIndex(l - 1, this.__thumbLeft);
        
        this.setMinValueByIndex(l - 1, this.__thumbRight);
    },
    
    setOption: function(name, value) {
        this.config[name] = value;
        this.refresh();
    },
    
    isSingleMode: function() {
        return this.config.mode === "single";
    },
    
    isRangeMode: function() {
        return this.config.mode === "range";
    },
    
    isSelectMode: function() {
        return this.config.mode === "select";
    },
    
    __hasValueChanged: function() {
        var previous = this.__previousValue;
        var current = { 
            min: this.__thumbLeft.getValue(),
            max: this.__thumbRight && this.__thumbRight.getValue()
        };
        
        return JSON.stringify(previous) !== JSON.stringify(current);
    },
    
    __getClosestThumbElement: function (positionX) {
        var leftDistance = Math.abs(this.__thumbLeft.getRight() - positionX),
            rightDistance = Math.abs(this.__thumbRight.getLeft() - positionX);
            
        return leftDistance > rightDistance ? this.__thumbRight : this.__thumbLeft;
    },
    
    __storeValues: function () {
        this.__valuesStore = {
            leftThumbValue: this.__thumbLeft.getValue(),
            leftThumbLeft: this.__thumbLeft.getLeft(),
            rightThumbValue: this.__thumbRight.getValue(),
            rightThumbLeft: this.__thumbRight.getLeft()
        };
    },      

    __loadStoredValues: function() {
        if (Object.keys(this.__valuesStore).length === 0 && this.__valuesStore.constructor === Object) return;

        this.__thumbLeft.setValue(this.__valuesStore.leftThumbValue);
        this.__thumbLeft.setLeft(this.__valuesStore.leftThumbLeft);
        if (this.isRangeMode()) {
            this.__thumbRight.setValue(this.__valuesStore.rightThumbValue);
            this.__thumbRight.setLeft(this.__valuesStore.rightThumbLeft);
        }
    },
    
    __setActiveLabel: function (index) {
        var previouslyActiveLabel = this.__targetElement.querySelector(".tick-label.selected");
        var currentlyActiveLabel = this.__targetElement.querySelector("#" + this.__targetElement.id + "_label" + index);
        if (previouslyActiveLabel) {
            previouslyActiveLabel.classList.remove("selected");
        }
        if (currentlyActiveLabel) {
            currentlyActiveLabel.classList.add("selected");
        }
    },
    
    __goToNextMarker: function() {
        if (this.isRangeMode()) return;
        
        var nextMarker = this.__thumbLeft.getIndex() + 1;
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
        this.setValueByIndex(nextMarker, this.__thumbLeft);
    },
    
    __getThumbStart: function(thumbElement) {
        return isNaN(parseFloat(thumbElement.style.left)) ? 0 : parseFloat(thumbElement.style.left);
    },
    
    __setAutoPlay: function(value) {
        if (this.isRangeMode()) return;
        
        if(!value) {
            clearInterval(this.__playInterval);
            this.fire("playStop", [this.__thumbLeft.getValue(), this.__targetElement]);
            return;
        }
        this.__playInterval = setInterval(this.__goToNextMarker.bind(this), this.config.autoPlayDelay);
        this.fire("playStart", [this.__thumbLeft.getValue(), this.__targetElement]);
    },
    
    __markElementAsSelected: function (element) {
        element.classList.toggle("selected");
    },
    
    __onValueChanged: function(previousValue, currentValue, thumb) {
        if (this.config.showValue) {
            thumb.getLabel().innerText = this.__getValueContent(currentValue);
        }
        if (this.config.highlightSelectedLabels) {
            //this.__setActiveLabel(currentValue);
        }
        if (this.__hasValueChanged()) {
            this.__previousValue = {
                min: this.__thumbLeft.getValue(),
                max: this.__thumbRight && this.__thumbRight.getValue()
            };
            if (this.isSingleMode()) {
                this.fire("valueChanged", [currentValue, this.__targetElement]);
            }
            else if (this.isRangeMode()) {
                this.fire("rangeChanged", [this.getRange(), this.__targetElement]);
            }
            if (this.isSelectMode()) {
                this.fire("selectionChanged", [this.getSelection(), this.__targetElement]);
            }
        }
    },
    
    __onTrackClicked: function(event) {
        this.config.slideMode === "free" ? this.__place(event.offsetX) : this.__snap(event.offsetX);
        this.fire("trackClicked", [this.__thumbLeft.getValue(), event.currentTarget]);
    },
    
    __onLabelClicked: function(event) {
        var positionX = event.currentTarget.offsetLeft + this.config.labelsWidth - this.config.thumbWidth / 2;
        var index = parseInt(event.currentTarget.dataset.index);
        var thumb = this.__getClosestThumbElement(positionX);
        this.config.slideMode === "free" ? this.__place(positionX, thumb) : this.__snap(positionX);
        this.fire("labelClicked", [thumb.getValue(), event.currentTarget]);
    },
    
    __onMarkerClicked: function(event) {
        if(this.isSelectMode()) {
            this.__markElementAsSelected(event.currentTarget);
        }
        else {
            var positionX = event.currentTarget.offsetLeft + this.config.markerSize / 2;
            var index = parseInt(event.currentTarget.dataset.index);
            var thumb = this.__getClosestThumbElement(positionX);
            this.config.slideMode === "free" ? this.setValueByIndex(index, thumb) : this.__snap(positionX);
        }
        this.fire("markerClicked", [this.__thumbLeft.getValue(), event.currentTarget]);
        event.preventDefault();
        event.stopPropagation();
    },
    
    __onThumbMouseDown: function(event) {
        this.__mouseStartPositionX = event.pageX;
        var thumb = this.__getThumbFromElement(event.currentTarget);
        this.__draggedThumb = thumb;
        thumb.start = this.__getThumbStart(event.currentTarget);
        thumb.getElement().classList.remove("animated");
        this.fire("thumbDragStart", [thumb.getValue(), event.currentTarget]);
        window.addEventListener("mousemove", this.__onThumbMouseMove);
        window.addEventListener("mouseup", this.__onThumbMouseUp);
    },
    
    __onThumbMouseUp: function(event) {
        var thumb = this.__draggedThumb;
        thumb.start = this.__getThumbStart(thumb.getElement());
        this.config.slideMode === "snap" ? this.__snap(thumb.start) : this.__place(thumb.start, thumb);
        this.fire("thumbDragEnd", [thumb.getValue(), thumb.getElement()]);
        this.__draggedThumb = null;
        thumb.getElement().classList.add("animated");
        window.removeEventListener("mousemove", this.__onThumbMouseMove);
        window.removeEventListener("mouseup", this.__onThumbMouseUp);
    },
    
    __onThumbMouseMove: function(event) {
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
        if (this.config.showTrackProgress) {
            if (this.isRangeMode()) {
                if (thumb.getElement().classList.contains(MAX_THUMB_CLASS)) {
                    this.__trackProgressElement.style.left = this.__thumbLeft.getLeft();
                    this.__trackProgressElement.style.width = (newLeft - this.__thumbLeft.getLeft()) + "px";
                }
                else if (thumb.getElement().classList.contains(MIN_THUMB_CLASS)) {
                    this.__trackProgressElement.style.left = newLeft + "px";
                    this.__trackProgressElement.style.width = (this.__thumbRight.getLeft() - newLeft) + "px";
                }
            }
            else {
                this.__trackProgressElement.style.width = newLeft + "px";
            }
        }
        this.__onUpdateMarkersProgress()
        this.fire("thumbDragged", [thumb.getValue(), thumb.getElement()]);
    },
    
    __onThumbTransitionEnd: function(event) {
        event.target.removeEventListener(event.type, this.__onThumbTransitionEnd);
        event.target.classList.remove("animated");
        if (this.config.showTrackMarkersProgress) {
            this.__onUpdateMarkersProgress();
            clearInterval(this.__markersUpdateInterval);
        }
        this.__trackProgressElement.classList.remove("animated");
    },
    
    __onUpdateMarkersProgress: function() {
        this.isRangeMode() ? this.__updateMarkerRange() : this.__updateMarkerProgress();
    },
    
    __checkIfTargetIsValid: function(target) {
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
    
    __onMouseWheel: function (event) {
        var event = window.event || event;
        var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
        delta = delta < 0 ? -1 : 1;
        
        if (this.isSingleMode()) {
            this.setValueByIndex(this.__thumbLeft.getIndex() + delta, this.__thumbLeft);
        }
        else if (this.isRangeMode()) {
            this.setMinValueByIndex(this.__thumbLeft.getIndex() + delta);
            this.setMaxValueByIndex(this.__thumbRight.getIndex() - delta);
        }

        return false;
    },
    
    __place: function (positionX, thumb, noAnimation) {
        var closestThumbElement = this.isRangeMode() ? thumb || this.__getClosestThumbElement(positionX) : this.__thumbLeft;
        var newValue = {};
        newValue[this.config.dataSource] = this.__getValueAtPosition(positionX);
        this.config.animations && !noAnimation && closestThumbElement.getElement().classList.add("animated");
        closestThumbElement.setLeft(positionX);
        
        if (this.config.showTrackMarkersProgress) {
            if (!this.config.animations || noAnimation) {
                this.__onUpdateMarkersProgress();
            }
            else {
                this.__onUpdateMarkersProgress();
                clearInterval(this.__markersUpdateInterval);
                this.__markersUpdateInterval = setInterval(this.__onUpdateMarkersProgress, 20);
            }
        }
        
        if (this.config.showTrackProgress) {
            this.config.animations && !noAnimation && this.__trackProgressElement.classList.add("animated");
            if (this.isRangeMode()) {
                if (closestThumbElement.getElement().classList.contains(MAX_THUMB_CLASS)) {
                    this.__trackProgressElement.style.left = this.__thumbLeft.getLeft();
                    this.__trackProgressElement.style.width = (positionX - this.__thumbLeft.getLeft()) + "px";
                }
                else if (closestThumbElement.getElement().classList.contains(MIN_THUMB_CLASS)) {
                    this.__trackProgressElement.style.left = positionX + "px";
                    this.__trackProgressElement.style.width = (this.__thumbRight.getLeft() - positionX) + "px";
                }
            }
            else {
                this.__trackProgressElement.style.width = positionX + "px";
            }
        }				
        
        if (this.config.animations && !noAnimation) { 
            closestThumbElement.getElement().addEventListener("webkitTransitionEnd", this.__onThumbTransitionEnd);
            closestThumbElement.getElement().addEventListener("otransitionend", this.__onThumbTransitionEnd);
            closestThumbElement.getElement().addEventListener("oTransitionEnd", this.__onThumbTransitionEnd);
            closestThumbElement.getElement().addEventListener("msTransitionEnd", this.__onThumbTransitionEnd);
            closestThumbElement.getElement().addEventListener("transitionend", this.__onThumbTransitionEnd);
        }
        
        var prevValue = closestThumbElement.getValue();
        closestThumbElement.setValue(newValue);
        this.__onValueChanged(prevValue, newValue, closestThumbElement);
    },
    
    __snap: function (positionX, thumb, noAnimation) {
        if (this.config.spacing === "data-driven") {
            var closestThumbElement = this.isRangeMode() ? thumb || this.__getClosestThumbElement(positionX) : this.__thumbLeft;
            var closestMarker = this.__getClosestMarker(positionX);
            var newLeft = positionX;
            var nextMarker;
            this.config.animations && !noAnimation && closestThumbElement.getElement().classList.add("animated");
            closestThumbElement.setLeft(newLeft);
            nextMarker = parseInt(closestMarker.dataset.index);
            
        }
        else {
            var distance = this.__getDistanceBetweenItems();
            var closestThumbElement = this.isRangeMode() ? thumb || this.__getClosestThumbElement(positionX) : this.__thumbLeft;
            
            this.config.animations && !noAnimation && closestThumbElement.getElement().classList.add("animated");
            
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
        }
        if (this.config.showTrackMarkersProgress) {
            if (!this.config.animations || noAnimation) {
                this.__onUpdateMarkersProgress();
            }
            else {
                this.__onUpdateMarkersProgress();
                clearInterval(this.__markersUpdateInterval);
                this.__markersUpdateInterval = setInterval(this.__onUpdateMarkersProgress, 20);
            }
        }
        
        if (this.config.showTrackProgress) {
            this.config.animations && !noAnimation && this.__trackProgressElement.classList.add("animated");
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
        
        if (this.config.animations && !noAnimation) { 
            closestThumbElement.getElement().addEventListener("webkitTransitionEnd", this.__onThumbTransitionEnd);
            closestThumbElement.getElement().addEventListener("otransitionend", this.__onThumbTransitionEnd);
            closestThumbElement.getElement().addEventListener("oTransitionEnd", this.__onThumbTransitionEnd);
            closestThumbElement.getElement().addEventListener("msTransitionEnd", this.__onThumbTransitionEnd);
            closestThumbElement.getElement().addEventListener("transitionend", this.__onThumbTransitionEnd);
        }
        
        var nextValue = this.getMarkerByIndex(nextMarker);
        var prevValue = closestThumbElement.getValue();
        closestThumbElement.setValue(nextValue);
        this.__onValueChanged(prevValue, nextValue, closestThumbElement);
    },
    
    __createUI: function() {
        var fragment = document.createDocumentFragment();
        this.__trackElement = this.__createTrackElement();
        this.__trackProgressElement = this.__createTrackProgressElement();
        this.__thumbLeft.setElement(this.__createThumbElement(MIN_THUMB_CLASS));
        this.isRangeMode() && this.__thumbRight.setElement(this.__createThumbElement(MAX_THUMB_CLASS));
       
        this.__sliderElement = this.__createSliderElement(this.__trackElement, this.__trackProgressElement, [
            this.__thumbLeft.getElement(),
            this.__thumbRight.getElement()
        ]);
        
        fragment.appendChild(this.__sliderElement);
        
        if (this.config.showLabels) {
            if (this.config.labelsPosition === "above") {
                this.__labelContainerElement = this.__createLabelsElement();
                this.__createLabels(this.__labelContainerElement, false, false, true);
                fragment.insertBefore(this.__labelContainerElement, this.__sliderElement);
            }
            else if (this.config.labelsPosition === "alternate") {
                this.__labelContainerElementTop = this.__createLabelsElement();
                this.__createLabels(this.__labelContainerElementTop, true, !this.config.startAlternateLabelsFromTop, true);
                this.__labelContainerElementBottom = this.__createLabelsElement();
                this.__createLabels(this.__labelContainerElementBottom, true, this.config.startAlternateLabelsFromTop, false);
                fragment.insertBefore(this.__labelContainerElementTop,this.__sliderElement);
                fragment.appendChild(this.__labelContainerElementBottom);
            }
            else {
                this.__labelContainerElement = this.__createLabelsElement();
                this.__createLabels(this.__labelContainerElement, false, false, false);
                fragment.appendChild(this.__labelContainerElement);
            }
        }
        
        if (this.config.showValue) {
            this.__thumbLeft.addLabel(this.__createValueElement());
            this.isRangeMode() && this.__thumbRight.addLabel(this.__createValueElement());
        }
        
        if (this.config.leftLabel) {
            this.__leftLabelElement = this.__createSideLabel(this.config.leftLabel);
            fragment.appendChild(this.__leftLabelElement);
            this.__leftLabelElement.style.left = - this.config.sideLabelsWidth + "px";
            this.__targetElement.style.marginLeft = this.config.sideLabelsWidth + "px";
        }
        
        if (this.config.rightLabel) {
            this.__rightLabelElement = this.__createSideLabel(this.config.rightLabel);
            fragment.appendChild(this.__rightLabelElement);
            this.__rightLabelElement.style.right = - this.config.sideLabelsWidth + "px";
            this.__targetElement.style.marginRight = this.config.sideLabelsWidth + "px";
        }
        
        if (this.config.showTrackMarkers) {
            this.__trackMarkerElements = this.__createTrackMarkers();
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
    
    __createTrackElement: function() {
        var trackElement = document.createElement("div");
        trackElement.className = "track noselect" + (this.config.animations ? " animated" : "");
        trackElement.style.height = this.config.trackHeight + "px";
        if (this.config.enableTrackClick) {
            trackElement.onclick = this.__onTrackClicked;
        }
        return trackElement; 
    },
    
    __createTrackProgressElement: function() {
        var trackProgressElement = document.createElement("div");
        trackProgressElement.className = "track-progress noselect";
        trackProgressElement.style.height = this.config.trackHeight + "px";
        return trackProgressElement; 
    },
    
    __createThumbElement: function(className) {
        var thumbElement = document.createElement("div");
        thumbElement.className = "thumb noselect " + className;
        thumbElement.style.width = this.config.thumbWidth + "px";
        thumbElement.style.marginTop = - this.config.thumbHeight / 2 - this.config.trackHeight / 2 + "px";
        thumbElement.style.height = this.config.thumbHeight + "px";
        thumbElement.onmousedown = this.__onThumbMouseDown;
        return thumbElement; 
    },
    
    __createSideLabel: function(labelText) {
        var labelElement = document.createElement("div");
        labelElement.innerText = labelText;
        labelElement.className = "side-label noselect";
        labelElement.style.width = this.config.sideLabelsWidth + "px";
        return labelElement;
    },
    
    __createSliderElement: function(trackElement, trackProgressElement, thumbElements) {
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
    
    __createValueElement: function() {
        var valueElement = document.createElement("div");
        valueElement.className = "value-indicator noselect";
        if (this.config.valueIndicatorPosition === "thumb") {
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
        
        if (this.config.valueIndicatorPosition === "above") {
            valueElement.style.top = - this.config.valueIndicatorHeight / 2 - this.config.thumbHeight / 2 - this.config.trackHeight - this.config.valueIndicatorOffset + "px";
            valueElement.classList.add("above");
        }
        else if (this.config.valueIndicatorPosition === "below") {
            valueElement.style.top = this.config.valueIndicatorHeight / 2 + this.config.thumbHeight / 2 - this.config.trackHeight / 2 + this.config.valueIndicatorOffset + "px";
            valueElement.classList.add("below");
        }
        return valueElement;
    },
    
    __createLabelsElement: function() {
        var labelsElement = document.createElement("div");
        labelsElement.className = "labels-container noselect";
        return labelsElement;
    },
    
    __createLabels: function (parent, everyOtherLabel, skipFirst, labelsBeforeTicks) {
        var labelOffset = this.config.labelsWidth / (everyOtherLabel ? 1 : 2) - this.config.thumbWidth / 2;
        var distanceOffset = this.config.thumbWidth;
        var total = this.config.data.length - 1;
        var half = total / 2;
        var distance = this.__getSmallestDistance(distanceOffset);
        for (var i = skipFirst ? 1 : 0; i <= total; everyOtherLabel ? i += 2 : i++) {				
            var labelElement = document.createElement("div");
            labelElement.className = "tick-label noselect";
            labelElement.style.width = this.config.labelsWidth * (everyOtherLabel ? 2 : 1) + "px";
            labelElement.id = this.__targetElement.id + "_label" + i;
            labelElement.dataset.index = i;
            if (this.config.enableLabelClick) {
                labelElement.onclick = this.__onLabelClicked;
            }
            if (this.config.spacing === "data-driven") {
                var currentDistance = "calc(" + distance + " * " + this.__getDistance(this.__getDataContent(this.config.data[i])) + " - " + labelOffset + "px)";
                labelElement.style.left = currentDistance;
            }
            else {
                labelElement.style.left = "calc(" + distance + " * " + i + " - " + labelOffset + "px)";
            }
            if (this.config.showTicks) {
                var tickElement = document.createElement("div");
                tickElement.className = "tick noselect";
                tickElement.style.height = this.config.tickHeight + "px";
                labelElement.appendChild(tickElement);
            }
            var span = document.createElement("span");
            span.className = "noselect";
            span.innerText = this.__getlabelsContent(this.config.data[i]);
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
    
    __createTrackMarkers: function () {
        var markerOffset = this.config.markerSize / 2 - this.config.thumbWidth / 2;
        var distanceOffset = this.config.thumbWidth;
        var total = this.config.data.length - 1;
        var l = this.config.data.length;
        var half = total / 2;
        var distance = this.__getSmallestDistance(distanceOffset);
        var markers = [];
        while (l--) {				
            var markerElement = document.createElement("div");
            markerElement.className = "track-marker noselect";
            markerElement.dataset.index = l;
            markerElement.style.width = this.config.markerSize + "px";
            markerElement.style.height = this.config.markerSize + "px";
            markerElement.style.top = - this.config.markerSize / 2 + this.config.trackHeight / 2 + "px";
            if (this.config.enableMarkerClick) {
                markerElement.onclick = this.__onMarkerClicked;
                markerElement.style.cursor = "pointer";
            }
            if (this.config.spacing === "data-driven") {
                var currentDifference = this.__getDistance(this.__getDataContent(this.config.data[l]));
                markerElement.style.left = "calc(" + distance + " * " + currentDifference + " - " + markerOffset + "px)";
            }
            else {
                markerElement.style.left = "calc(" + distance + " * " + l + " - " + markerOffset + "px)";
            }
            markers.push(markerElement);
        }
        
        if (this.config.showTooltips) {
            this.__attachTooltips(markers);
        }
        return markers;
    },
    
    __attachMouseWheelHandlers: function() {
        if (this.__targetElement.addEventListener) {
            this.__targetElement.addEventListener("mousewheel", this.__onMouseWheel, false);
            this.__targetElement.addEventListener("DOMMouseScroll", this.__onMouseWheel, false);
        }
        else {
            this.__targetElement.attachEvent("onmousewheel", this.__onMouseWheel);
        }
    },
    
    __detachMouseWheelHandlers: function() {
        if (this.__targetElement.removeEventListener) {
            this.__targetElement.removeEventListener("mousewheel", this.__onMouseWheel, false);
            this.__targetElement.removeEventListener("DOMMouseScroll", this.__onMouseWheel, false);
        }
        else {
            this.__targetElement.detachEvent("onmousewheel", this.__onMouseWheel);
        }
    },
    
    __attachTooltips: function (markers) {
        var l = markers.length;
        while (l--) {
            var tooltipElement = document.createElement("span");
            tooltipElement.classList.add("content");
            tooltipElement.innerText = this.__getTooltipsContent(this.config.data[l]);
            markers[l].classList.add("tooltip");
            markers[l].appendChild(tooltipElement);
        }
    },
    
    __getDataContent: function (item) {
        if (this.__isString(this.config.dataSource)) {
            return item[this.config.dataSource];
        }
        else if (typeof this.config.dataSource === "function") {
            return this.config.dataSource.call(this, item);
        }
        else {
            return item;
        }
    },
    
    __getlabelsContent: function (item) {
        if (this.__isString(this.config.labelsContent)) {
            return item[this.config.labelsContent];
        }
        else if (typeof this.config.labelsContent === "function") {
            return this.config.labelsContent.call(this, item);
        }
        else {
            return item;
        }
    },
    
    __getValueContent: function (item) {
        if (this.__isString(this.config.valueIndicatorContent)) {
            return item[this.config.valueIndicatorContent];
        }
        else if (typeof this.config.valueIndicatorContent === "function") {
            return this.config.valueIndicatorContent.call(this, item);
        }
        else {
            return item;
        }
    },
    
    __getTooltipsContent: function (item) {
        if (this.__isString(this.config.tooltipsContent)) {
            return item[this.config.tooltipsContent];
        }
        else if (typeof this.config.tooltipsContent === "function") {
            return this.config.tooltipsContent.call(this, item);
        }
        else {
            return item;
        }
    },
    
    __getValueAtPosition: function (positionX) {
        var result;
        var minValue = Math.min.apply(Math, (this.config.data.map(function (item) { return this.__getDataContent(item); }.bind(this))));
        var maxValue = Math.max.apply(Math, (this.config.data.map(function (item) { return this.__getDataContent(item); }.bind(this))));
        var valueSpan = Math.abs(maxValue - minValue);
        
        var minValueInPixels = this.__trackMarkerElements[0].offsetLeft;
        var maxValueInPixels = this.__trackMarkerElements[this.config.data.length - 1].offsetLeft;
        var pixelSpan = Math.abs(minValueInPixels - maxValueInPixels);
        
        result = minValue + valueSpan * positionX / pixelSpan;

        return this.__isDataTemporal() ? new Date(result) : result;
    },
    
    __getPositionFromValue: function (value) {
        var parsedValue,
            position;
            
        var minValue = Math.min.apply(Math, (this.config.data.map(function (item) { return this.__getDataContent(item); }.bind(this))));
        var maxValue = Math.max.apply(Math, (this.config.data.map(function (item) { return this.__getDataContent(item); }.bind(this))));
        var valueSpan = Math.abs(maxValue - minValue);
        
        var minValueInPixels = this.__trackMarkerElements[0].offsetLeft;
        var maxValueInPixels = this.__trackMarkerElements[this.config.data.length - 1].offsetLeft;
        var pixelSpan = Math.abs(minValueInPixels - maxValueInPixels);
        
        if (this.__isNumeric(value)) {
            parsedValue = value;
            position = minValueInPixels + pixelSpan * parsedValue / valueSpan;
        }
        else if (this.__isString(value)) {
            parsedValue = value.endsWith("%") ? parseFloat(value) / 100 : parseFloat(value);
            position = minValueInPixels + pixelSpan * parsedValue;
        }
        else if (this.__isDate(value)) {
            parsedValue = value.getTime();
            position = minValueInPixels + pixelSpan * parsedValue / valueSpan;
        }
        else if (!this.__isSet(parsedValue)) {
            position = 0;
        }
        
        return position;
    },
    
    __getDistanceBetweenItems: function () {
        var distanceOffset = this.config.thumbWidth;
        return (this.__targetElement.clientWidth - distanceOffset) / ((this.config.data.length - 1) / this.config.stepSize);
    },
    
    __getClosestMarker: function (positionX) {
        var distanceOffset = this.config.thumbWidth;
        var l = this.config.data.length;
        var closestMarker;
        while (l--) {
            if (!closestMarker || Math.abs(this.__trackMarkerElements[l].offsetLeft - positionX) < Math.abs(closestMarker.offsetLeft - positionX)) {
                closestMarker = this.__trackMarkerElements[l];
            }
        }
        return closestMarker;
    },
    
    __adjustConfiguration: function (config) {
        var total = this.config.data.length - 1;
        this.config.endPosition = this.config.endPosition > total ? total : this.config.endPosition;
        if (this.isRangeMode()) {
            this.config.autoPlay = false;
            this.config.loop = false;
        }
        else if (this.isSelectMode()) {
            this.config.showTrackMarkers = true;
        }
        
        if (this.__isDataTemporal() && !config.spacing) {
            this.config.spacing = "data-driven";
        }
    },
    
    __isDataTemporal: function() {
        var l = this.config.data.length;
        while (l--) {
            var item = this.__getDataContent(this.config.data[l]);
            if (!this.__isDate(item)) {
                return false;
            }
        }
        return true;
    },
    
    __getThumbFromElement: function (element) {
        if (element.classList.contains(MAX_THUMB_CLASS)) {
            return this.__thumbRight;
        }
        else if (element.classList.contains(MIN_THUMB_CLASS)) {
            return this.__thumbLeft;
        }
    },
    
    __getSmallestDistance: function(offset) {
        if (this.config.spacing === "data-driven") {
            var minDate = Math.min.apply(Math, (this.config.data.map(function (item) { return this.__getDataContent(item); }.bind(this))));
            var maxDate = Math.max.apply(Math, (this.config.data.map(function (item) { return this.__getDataContent(item); }.bind(this))));
            var difference = Math.abs(maxDate - minDate) / 1000;
            
            return "((100% - " + offset + "px) / " + difference + ")";
        }
        else {
            return "((100% - " + offset + "px) / " + (this.config.data.length - 1) + ")";
        }
    },
    
    __getDistance: function (value) {           
        if (this.config.spacing === "data-driven") {
            var minDate = Math.min.apply(Math, (this.config.data.map(function (item) { return this.__getDataContent(item); }.bind(this))));
            return Math.abs(value - minDate) / 1000;
        }
        else {
            return 0;
        }
    },
    
    __setThumbsInitialPositions: function () {
        var distanceOffset = this.config.thumbWidth;
        var distance = (this.__targetElement.clientWidth - distanceOffset) / ((this.config.data.length - 1) / this.config.stepSize);

        this.__snap(distance * this.config.startPosition, this.__thumbLeft, true);
        if (this.isRangeMode()) {
            this.__snap(distance * this.config.endPosition, this.__thumbRight, true);
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
        var distanceBetweenThumbs = this.__thumbRight.getLeft() - this.__thumbLeft.getRight();
        return distanceBetweenThumbs <= this.__minimalDistanceBetweenThumbs;
    },
    
    getMarkerByIndex: function(index) {
        return this.config.data[index];
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
    },
    
    __isNumeric: function (value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    },
    
    __isDate: function (item) {
        return item instanceof Date && typeof item.getMonth === "function";
    },
    
    __isSet: function(value) {
        return !(value === undefined || value === null);
    }
};

function rangeslide(target, config) {
    return new Rangeslide(target, config);
}

return rangeslide;

}));
