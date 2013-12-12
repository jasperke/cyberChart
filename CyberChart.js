!function (global) {
	'use strict';

	var previousCyberChart = global.CyberChart;

	function CyberChart(el, data, options) {
		this._element = (typeof(el) == 'string') ? $('#' + el) : $(el);
		this._data = data;
		this.options = {
			width: 1000, // UI列印時用250x210, UI螢幕顯示用 *1.4, 此處繪製時用 *4 (畫高解析,印時才不會鋸齒)
			height: 840,
			barWidth: 0.6, // 柱狀圖, bar的寬度%
			xTitle: '',
			yTitle: '',
			xLength: 760, // X軸長
			yLength: 500, // Y軸長
			xyLineWidth: 2, // X,Y軸粗細
			yScale: [0, 5, 10, 15, 20, 25, 30], // 未特別指定者,Y軸於此刻度處畫橫線及label
			type: 'bar', // 支援 bar, line 兩種
			barColor: 'rgba(180,180,180,0.7)', // 預設bar底色
			canvasColor: '#ffffff',
			brokenLineColor: 'rgba(160,160,160,0.7)', // 折線圖, 折線顏色
			brokenLineWidth: 16,
			dot: true, // 要不要在數值處加點
			dotColor: '#ffffff',
			dotStrokeWidth: 12,
			dotStrokeColor: 'rgba(100,100,100,0.7)',
			dotRadius: 7, // dot半徑
			scaleLineColor: '#000000', // X,Y軸及刻度線顏色
			scaleLineWidth: 2, // 刻度線粗細
			fontColor: '#000000' // X,Y軸標題文字, 刻度標示數字顏色
		};
		$.extend(this.options, options);
		//setTimeout($.proxy(this._prepare,this),0); /* IE使用explorercanvas, 以動態產生canvas, 同thread立即執行getContext()會有錯 */
		this._prepare();
	}
	CyberChart.prefixZero = function (n) {
		return n >= 10 ? n : '0' + n;
	};
	CyberChart.noConflict = function () {
		global.CyberChart = previousCyberChart;
		return CyberChart;
	};
	CyberChart.prototype = {
		_prepare: function () {
			this.set({xLength: this.get('width') - 190 - 50, yLength: this.get('height') - 100 - 240});

			var jCanvas = $('<canvas/>').attr({width: this.get('width'), height: this.get('height')}).appendTo(this._element);
			// 預設以width*height顯示, 若需縮小顯示, 可自行於html中css, 設定canvas的寬高

			//	if(!jCanvas[0].getContext){ // 不考慮IE舊版
			//		G_vmlCanvasManager.initElement(jCanvas[0]);
			//	}
			this._context2d = jCanvas.get(0).getContext('2d');

			if (!this._context2d.setLineDash) {
				this._context2d.setLineDash = $.proxy(function (ary) {
					this._context2d.mozDash = ary;
					this._context2d.webkitLineDash = ary; // safari無效??
				}, this);
			}

			this._drawBase();
			this._drawXTitle();
			this._drawYTitle();
			this._drawData();
		},
		_setLineDashOffset: function (n) {
			this._context2d.lineDashOffset = n;
			this._context2d.mozDashOffset = n;
			this._context2d.webkitLineDashOffset = n;
		},
		set: function (obj) {
			for (var p in obj) {
				if (obj.hasOwnProperty(p)) {
					this.options[p] = obj[p];
				}
			}
		},
		get: function (p) {
			return this.options[p];
		},
		_drawBase: function () {
			this._context2d.save();

			// 白色背景
			this._context2d.fillStyle = this.get('canvasColor');
			this._context2d.fillRect(0, 0, this.get('width') + 1, this.get('height') + 1);

			// 文字樣式
			this._context2d.fillStyle = this.get('fontColor');
			this._context2d.font = '34px sans-serif';

			this._context2d.translate(190.5, 100.5); // 原點移至Y軸最高點處

			this._context2d.strokeStyle = this.get('scaleLineColor');

			// X軸 (下面畫Y軸刻度線時會一併畫出, 所以不必畫了)
			// this._context2d.moveTo(-20, 500);
			// this._context2d.lineTo(760, 500);

			var xLength = this.get('xLength'),
				yLength = this.get('yLength'),
				yScale = this.get('yScale'),
				factor = yLength / (yScale[yScale.length - 1] - yScale[0]),
				y,
				i,
				xDistance = Math.floor(xLength / Math.max(5, this._data.length)); // X軸刻度間距, 至少5項

			// Y軸
			this._context2d.beginPath();
			this._context2d.lineWidth = this.get('xyLineWidth');
			this._context2d.moveTo(0, 0);
			this._context2d.lineTo(0, yLength + 20);
			this._context2d.stroke();

			// Y軸上刻度線
			for (i = 0; i < yScale.length; i++) {
				y = Math.round(yLength - (yScale[i] - yScale[0]) * factor);
				this._context2d.beginPath();

				this._context2d.save(); // Y軸用到虛線, 之後須恢復直線

				this._context2d.moveTo(-20, y); // 往左凸出20為Y軸刻度標線
				this._context2d.lineTo(xLength, y);
				this._context2d.fillText(yScale[i], -70, y + 10);

				if (i > 0) {
					this._context2d.setLineDash([5, 5]);
					this._context2d.lineWidth = this.get('scaleLineWidth');
				} else { // i=0即X軸
					this._context2d.lineWidth = this.get('xyLineWidth');
				}
				this._context2d.stroke();

				this._context2d.restore();
			}

			// X軸刻度間距 750/5=150

			this._context2d.beginPath();
			i = xDistance;
			while (i <= xLength) {
				this._context2d.moveTo(i, yLength);
				this._context2d.lineTo(i, yLength + 20); // 往下凸出20為X軸刻度標線
				i += xDistance;
			}
			this._context2d.stroke();

			this._context2d.restore();
		},
		_drawData: function () {

			this._context2d.save();

			this._context2d.translate(190.5, 100.5); // 原點移至Y軸最高點處

			var xLength = this.get('xLength'),
				yLength = this.get('yLength'),
				yScale = this.get('yScale'),
				data = this._data, // [{label:'2013-12-12',value:20},{},...]
				factor = yLength / (yScale[yScale.length - 1] - yScale[0]),
				i = 0,
				xDistance = Math.floor(xLength / Math.max(5, this._data.length)), // X軸刻度間距
				barWidth = this.get('barWidth') * xDistance, //    Math.round(xDistance / 4 * 2),
				barSpace = (1 - this.get('barWidth')) / 2 * xDistance, // Math.round(xDistance / 4 * 1),
				x, y,
				datePart,
				fontDim,
				linePos = []; // 畫折線時記線的座標[[x,y],[x1,y1],...]

			for (i = 0; i < data.length; i++) {
				if (data[i].value === '') {
					continue;
				}

				y = Math.round(yLength - (data[i].value - yScale[0]) * factor);
				if (this.get('type') == 'bar') {
					x = barSpace + i * xDistance;

					// bar顏色
					this._context2d.fillStyle = this.get('barColor');
					this._context2d.lineWidth = 5;
					this._context2d.fillRect(x, y, barWidth, data[i].value * factor);
					this._context2d.strokeRect(x, y, barWidth, data[i].value * factor);
				} else if (this.get('type') == 'line') {
					x = Math.round((xDistance / 2) + (i * xDistance));
					linePos.push([x, y]); // 先記下各點座標, 之後一次畫
				}

				// time label
				this._context2d.fillStyle = this.get('fontColor');
				this._context2d.font = '34px sans-serif';
				datePart = data[i].label.split('-');
				fontDim = this._context2d.measureText(datePart[1] + '/' + datePart[2]);

				this._context2d.fillText(datePart[1] + '/' + datePart[2], Math.round(i * xDistance + (xDistance - fontDim.width) / 2), yLength + 60);
				fontDim = this._context2d.measureText(datePart[0]);
				this._context2d.fillText(datePart[0], Math.round(i * xDistance + (xDistance - fontDim.width) / 2), yLength + 100);
			}

			if (this.get('type') == 'line' && linePos.length) { // 畫折線
				this._drawBrokenLine(linePos);
				if (this.get('dot')) {
					this._drawDot(linePos);
				}
			}
			this._context2d.restore();
		},
		_drawBrokenLine: function (linePos) {
			this._context2d.save();

			this._context2d.strokeStyle = this.get('brokenLineColor');
			this._context2d.lineWidth = this.get('brokenLineWidth');
			this._context2d.lineJoin = 'round';

			this._context2d.beginPath();
			for (var i = 0; i < linePos.length; i++) {
				if (i == 0) {
					this._context2d.moveTo(linePos[i][0], linePos[i][1]);
				} else {
					this._context2d.lineTo(linePos[i][0], linePos[i][1]);
				}
			}
			this._context2d.stroke();
			this._context2d.restore();
		},
		_drawDot: function (linePos) {
			this._context2d.save();

			this._context2d.strokeStyle = this.get('dotStrokeColor');
			this._context2d.lineWidth = this.get('dotStrokeWidth');
			this._context2d.fillStyle = this.get('dotColor');

			for (var i = 0; i < linePos.length; i++) {
				this._context2d.beginPath();
				this._context2d.arc(linePos[i][0], linePos[i][1], this.get('dotRadius'), 0, Math.PI * 2, false);
				this._context2d.closePath();
				this._context2d.stroke();
				this._context2d.fill();
			}

			this._context2d.restore();
		},
		_drawYTitle: function () {
			this._context2d.save();
			this._context2d.fillStyle = this.get('fontColor');
			this._context2d.translate(70, Math.round(this.get('yLength') / 5 * 4));
			this._context2d.rotate(-90 * (Math.PI / 180));
			this._context2d.font = '44px sans-serif';
			this._context2d.fillText(this.get('yTitle'), 0, 0);
			this._context2d.restore();
		},
		_drawXTitle: function () {
			this._context2d.save();
			this._context2d.fillStyle = this.get('fontColor');
			this._context2d.font = '44px sans-serif';
			this._context2d.fillText(this.get('xTitle'), Math.round(this.get('width') / 7 * 3), this.get('height') - 60);
			this._context2d.restore();
		}
	};

	global.CyberChart = CyberChart;
}(this);
