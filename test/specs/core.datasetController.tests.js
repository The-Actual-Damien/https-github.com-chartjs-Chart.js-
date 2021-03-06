describe('Chart.DatasetController', function() {
  it('should listen for dataset data insertions or removals', function() {
    var data = [0, 1, 2, 3, 4, 5];
    var chart = acquireChart({
      type: 'line',
      data: {
        datasets: [{
          data: data
        }]
      }
    });

    var controller = chart.getDatasetMeta(0).controller;
    var methods = [
      '_onDataPush',
      '_onDataPop',
      '_onDataShift',
      '_onDataSplice',
      '_onDataUnshift'
    ];

    methods.forEach(function(method) {
      spyOn(controller, method);
    });

    data.push(6, 7, 8);
    data.push(9);
    data.pop();
    data.shift();
    data.shift();
    data.shift();
    data.splice(1, 4, 10, 11);
    data.unshift(12, 13, 14, 15);
    data.unshift(16, 17);

    [2, 1, 3, 1, 2].forEach(function(expected, index) {
      expect(controller[methods[index]].calls.count()).toBe(expected);
    });
  });

  it('should not try to delete non existent stacks', function() {
    function createAndUpdateChart() {
      var chart = acquireChart({
        data: {
          labels: ['q'],
          datasets: [
            {
              id: 'dismissed',
              label: 'Test before',
              yAxisID: 'count',
              data: [816],
              type: 'bar',
              stack: 'stack'
            }
          ]
        },
        options: {
          scales: {
            count: {
              axis: 'y',
              type: 'linear'
            }
          }
        }
      });

      chart.data = {
        datasets: [
          {
            id: 'tests',
            yAxisID: 'count',
            label: 'Test after',
            data: [38300],
            type: 'bar'
          }
        ],
        labels: ['q']
      };

      chart.update();
    }

    expect(createAndUpdateChart).not.toThrow();
  });

  describe('inextensible data', function() {
    it('should handle a frozen data object', function() {
      function createChart() {
        var data = Object.freeze([0, 1, 2, 3, 4, 5]);
        expect(Object.isExtensible(data)).toBeFalsy();

        var chart = acquireChart({
          type: 'line',
          data: {
            datasets: [{
              data: data
            }]
          }
        });

        var dataset = chart.data.datasets[0];
        dataset.data = Object.freeze([5, 4, 3, 2, 1, 0]);
        expect(Object.isExtensible(dataset.data)).toBeFalsy();
        chart.update();

        // Tests that the unlisten path also works for frozen objects
        chart.destroy();
      }

      expect(createChart).not.toThrow();
    });

    it('should handle a sealed data object', function() {
      function createChart() {
        var data = Object.seal([0, 1, 2, 3, 4, 5]);
        expect(Object.isExtensible(data)).toBeFalsy();

        var chart = acquireChart({
          type: 'line',
          data: {
            datasets: [{
              data: data
            }]
          }
        });

        var dataset = chart.data.datasets[0];
        dataset.data = Object.seal([5, 4, 3, 2, 1, 0]);
        expect(Object.isExtensible(dataset.data)).toBeFalsy();
        chart.update();

        // Tests that the unlisten path also works for frozen objects
        chart.destroy();
      }

      expect(createChart).not.toThrow();
    });

    it('should handle an unextendable data object', function() {
      function createChart() {
        var data = Object.preventExtensions([0, 1, 2, 3, 4, 5]);
        expect(Object.isExtensible(data)).toBeFalsy();

        var chart = acquireChart({
          type: 'line',
          data: {
            datasets: [{
              data: data
            }]
          }
        });

        var dataset = chart.data.datasets[0];
        dataset.data = Object.preventExtensions([5, 4, 3, 2, 1, 0]);
        expect(Object.isExtensible(dataset.data)).toBeFalsy();
        chart.update();

        // Tests that the unlisten path also works for frozen objects
        chart.destroy();
      }

      expect(createChart).not.toThrow();
    });
  });

  it('should parse data using correct scales', function() {
    const data1 = [0, 1, 2, 3, 4, 5];
    const data2 = ['a', 'b', 'c', 'd', 'a'];
    const chart = acquireChart({
      type: 'line',
      data: {
        datasets: [
          {data: data1},
          {data: data2, xAxisID: 'x2', yAxisID: 'y2'}
        ]
      },
      options: {
        scales: {
          x: {
            type: 'category',
            labels: ['one', 'two', 'three', 'four', 'five', 'six']
          },
          x2: {
            type: 'logarithmic',
            labels: ['1', '10', '100', '1000', '2000']
          },
          y: {
            type: 'linear'
          },
          y2: {
            type: 'category',
            labels: ['a', 'b', 'c', 'd', 'e']
          }
        }
      }
    });

    const meta1 = chart.getDatasetMeta(0);
    const parsedXValues1 = meta1._parsed.map(p => p.x);
    const parsedYValues1 = meta1._parsed.map(p => p.y);

    expect(meta1.data.length).toBe(6);
    expect(parsedXValues1).toEqual([0, 1, 2, 3, 4, 5]); // label indices
    expect(parsedYValues1).toEqual(data1);

    const meta2 = chart.getDatasetMeta(1);
    const parsedXValues2 = meta2._parsed.map(p => p.x);
    const parsedYValues2 = meta2._parsed.map(p => p.y);

    expect(meta2.data.length).toBe(5);
    expect(parsedXValues2).toEqual([1, 10, 100, 1000, 2000]); // logarithmic scale labels
    expect(parsedYValues2).toEqual([0, 1, 2, 3, 0]); // label indices
  });

  it('should parse using provided keys', function() {
    const chart = acquireChart({
      type: 'line',
      data: {
        datasets: [{
          data: [
            {x: 1, data: {key: 'one', value: 20}},
            {data: {key: 'two', value: 30}}
          ]
        }]
      },
      options: {
        parsing: {
          xAxisKey: 'data.key',
          yAxisKey: 'data.value'
        },
        scales: {
          x: {
            type: 'category',
            labels: ['one', 'two']
          },
          y: {
            type: 'linear'
          },
        }
      }
    });

    const meta = chart.getDatasetMeta(0);
    const parsedXValues = meta._parsed.map(p => p.x);
    const parsedYValues = meta._parsed.map(p => p.y);

    expect(meta.data.length).toBe(2);
    expect(parsedXValues).toEqual([0, 1]); // label indices
    expect(parsedYValues).toEqual([20, 30]);
  });

  it('should synchronize metadata when data are inserted or removed and parsing is on', function() {
    const data = [0, 1, 2, 3, 4, 5];
    const chart = acquireChart({
      type: 'line',
      data: {
        datasets: [{
          data: data
        }]
      }
    });

    const meta = chart.getDatasetMeta(0);
    const parsedYValues = () => meta._parsed.map(p => p.y);
    let first, second, last;

    first = meta.data[0];
    last = meta.data[5];
    data.push(6, 7, 8);
    data.push(9);
    expect(meta.data.length).toBe(10);
    expect(meta.data[0]).toBe(first);
    expect(meta.data[5]).toBe(last);
    expect(parsedYValues()).toEqual(data);

    last = meta.data[9];
    data.pop();
    expect(meta.data.length).toBe(9);
    expect(meta.data[0]).toBe(first);
    expect(meta.data.indexOf(last)).toBe(-1);
    expect(parsedYValues()).toEqual(data);

    last = meta.data[8];
    data.shift();
    data.shift();
    data.shift();
    expect(meta.data.length).toBe(6);
    expect(meta.data.indexOf(first)).toBe(-1);
    expect(meta.data[5]).toBe(last);
    expect(parsedYValues()).toEqual(data);

    first = meta.data[0];
    second = meta.data[1];
    last = meta.data[5];
    data.splice(1, 4, 10, 11);
    expect(meta.data.length).toBe(4);
    expect(meta.data[0]).toBe(first);
    expect(meta.data[3]).toBe(last);
    expect(meta.data.indexOf(second)).toBe(-1);
    expect(parsedYValues()).toEqual(data);

    data.unshift(12, 13, 14, 15);
    data.unshift(16, 17);
    expect(meta.data.length).toBe(10);
    expect(meta.data[6]).toBe(first);
    expect(meta.data[9]).toBe(last);
    expect(parsedYValues()).toEqual(data);
  });

  it('should synchronize metadata when data are inserted or removed and parsing is off', function() {
    var data = [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}, {x: 3, y: 3}, {x: 4, y: 4}, {x: 5, y: 5}];
    var chart = acquireChart({
      type: 'line',
      data: {
        datasets: [{
          data: data
        }]
      },
      options: {
        parsing: false,
        scales: {
          x: {type: 'linear'},
          y: {type: 'linear'}
        }
      }
    });

    var meta = chart.getDatasetMeta(0);
    var controller = meta.controller;
    var first, last;

    first = controller.getParsed(0);
    last = controller.getParsed(5);
    data.push({x: 6, y: 6}, {x: 7, y: 7}, {x: 8, y: 8});
    data.push({x: 9, y: 9});
    expect(meta.data.length).toBe(10);
    expect(controller.getParsed(0)).toBe(first);
    expect(controller.getParsed(5)).toBe(last);

    last = controller.getParsed(9);
    data.pop();
    expect(meta.data.length).toBe(9);
    expect(controller.getParsed(0)).toBe(first);
    expect(controller.getParsed(9)).toBe(undefined);
    expect(controller.getParsed(8)).toEqual({x: 8, y: 8});

    last = controller.getParsed(8);
    data.shift();
    data.shift();
    data.shift();
    expect(meta.data.length).toBe(6);
    expect(controller.getParsed(5)).toBe(last);

    first = controller.getParsed(0);
    last = controller.getParsed(5);
    data.splice(1, 4, {x: 10, y: 10}, {x: 11, y: 11});
    expect(meta.data.length).toBe(4);
    expect(controller.getParsed(0)).toBe(first);
    expect(controller.getParsed(3)).toBe(last);
    expect(controller.getParsed(1)).toEqual({x: 10, y: 10});

    data.unshift({x: 12, y: 12}, {x: 13, y: 13}, {x: 14, y: 14}, {x: 15, y: 15});
    data.unshift({x: 16, y: 16}, {x: 17, y: 17});
    expect(meta.data.length).toBe(10);
    expect(controller.getParsed(6)).toBe(first);
    expect(controller.getParsed(9)).toBe(last);
  });

  it('should re-synchronize metadata when the data object reference changes', function() {
    var data0 = [0, 1, 2, 3, 4, 5];
    var data1 = [6, 7, 8];
    var chart = acquireChart({
      type: 'line',
      data: {
        datasets: [{
          data: data0
        }]
      }
    });

    var meta = chart.getDatasetMeta(0);

    expect(meta.data.length).toBe(6);
    expect(meta._parsed.map(p => p.y)).toEqual(data0);

    chart.data.datasets[0].data = data1;
    chart.update();

    expect(meta.data.length).toBe(3);
    expect(meta._parsed.map(p => p.y)).toEqual(data1);

    data1.push(9);
    expect(meta.data.length).toBe(4);

    chart.data.datasets[0].data = data0;
    chart.update();

    expect(meta.data.length).toBe(6);
    expect(meta._parsed.map(p => p.y)).toEqual(data0);
  });

  it('should re-synchronize metadata when data are unusually altered', function() {
    var data = [0, 1, 2, 3, 4, 5];
    var chart = acquireChart({
      type: 'line',
      data: {
        datasets: [{
          data: data
        }]
      }
    });

    var meta = chart.getDatasetMeta(0);

    expect(meta.data.length).toBe(6);

    data.length = 2;
    chart.update();

    expect(meta.data.length).toBe(2);

    data.length = 42;
    chart.update();

    expect(meta.data.length).toBe(42);
  });

  // https://github.com/chartjs/Chart.js/issues/7243
  it('should re-synchronize metadata when data is moved and values are equal', function() {
    var data = [10, 10, 10, 10, 10, 10];
    var chart = acquireChart({
      type: 'line',
      data: {
        labels: ['a', 'b', 'c', 'd', 'e', 'f'],
        datasets: [{
          data,
          fill: true
        }]
      }
    });

    var meta = chart.getDatasetMeta(0);

    expect(meta.data.length).toBe(6);
    const firstX = meta.data[0].x;

    data.push(data.shift());
    chart.update();

    expect(meta.data.length).toBe(6);
    expect(meta.data[0].x).toEqual(firstX);
  });

  // https://github.com/chartjs/Chart.js/issues/7445
  it('should re-synchronize metadata when data is objects and directly altered', function() {
    var data = [{x: 'a', y: 1}, {x: 'b', y: 2}, {x: 'c', y: 3}];
    var chart = acquireChart({
      type: 'line',
      data: {
        labels: ['a', 'b', 'c'],
        datasets: [{
          data,
          fill: true
        }]
      }
    });

    var meta = chart.getDatasetMeta(0);

    expect(meta.data.length).toBe(3);
    const y3 = meta.data[2].y;

    data[0].y = 3;
    chart.update();
    expect(meta.data[0].y).toEqual(y3);
  });

  it('should re-synchronize metadata when scaleID changes', function() {
    var chart = acquireChart({
      type: 'line',
      data: {
        datasets: [{
          data: [],
          xAxisID: 'firstXScaleID',
          yAxisID: 'firstYScaleID',
        }]
      },
      options: {
        scales: {
          firstXScaleID: {
            type: 'category',
            position: 'bottom'
          },
          secondXScaleID: {
            type: 'category',
            position: 'bottom'
          },
          firstYScaleID: {
            type: 'linear',
            position: 'left'
          },
          secondYScaleID: {
            type: 'linear',
            position: 'left'
          },
        }
      }
    });

    var meta = chart.getDatasetMeta(0);

    expect(meta.xAxisID).toBe('firstXScaleID');
    expect(meta.yAxisID).toBe('firstYScaleID');

    chart.data.datasets[0].xAxisID = 'secondXScaleID';
    chart.data.datasets[0].yAxisID = 'secondYScaleID';
    chart.update();

    expect(meta.xAxisID).toBe('secondXScaleID');
    expect(meta.yAxisID).toBe('secondYScaleID');
  });

  it('should re-synchronize stacks when stack is changed', function() {
    var chart = acquireChart({
      type: 'bar',
      data: {
        labels: ['a', 'b'],
        datasets: [{
          data: [1, 10],
          stack: '1'
        }, {
          data: [2, 20],
          stack: '2'
        }, {
          data: [3, 30],
          stack: '1'
        }]
      }
    });

    expect(chart._stacks).toEqual({
      'x.y.1.bar': {
        0: {0: 1, 2: 3},
        1: {0: 10, 2: 30}
      },
      'x.y.2.bar': {
        0: {1: 2},
        1: {1: 20}
      }
    });

    chart.data.datasets[2].stack = '2';
    chart.update();

    expect(chart._stacks).toEqual({
      'x.y.1.bar': {
        0: {0: 1},
        1: {0: 10}
      },
      'x.y.2.bar': {
        0: {1: 2, 2: 3},
        1: {1: 20, 2: 30}
      }
    });
  });

  it('should re-synchronize stacks when data is removed', function() {
    var chart = acquireChart({
      type: 'bar',
      data: {
        labels: ['a', 'b'],
        datasets: [{
          data: [1, 10],
          stack: '1'
        }, {
          data: [2, 20],
          stack: '2'
        }, {
          data: [3, 30],
          stack: '1'
        }]
      }
    });

    expect(chart._stacks).toEqual({
      'x.y.1.bar': {
        0: {0: 1, 2: 3},
        1: {0: 10, 2: 30}
      },
      'x.y.2.bar': {
        0: {1: 2},
        1: {1: 20}
      }
    });

    chart.data.datasets[2].data = [4];
    chart.update();

    expect(chart._stacks).toEqual({
      'x.y.1.bar': {
        0: {0: 1, 2: 4},
        1: {0: 10}
      },
      'x.y.2.bar': {
        0: {1: 2},
        1: {1: 20}
      }
    });
  });

  it('should cleanup attached properties when the reference changes or when the chart is destroyed', function() {
    var data0 = [0, 1, 2, 3, 4, 5];
    var data1 = [6, 7, 8];
    var chart = acquireChart({
      type: 'line',
      data: {
        datasets: [{
          data: data0
        }]
      }
    });

    var hooks = ['push', 'pop', 'shift', 'splice', 'unshift'];

    expect(data0._chartjs).toBeDefined();
    hooks.forEach(function(hook) {
      expect(data0[hook]).not.toBe(Array.prototype[hook]);
    });

    expect(data1._chartjs).not.toBeDefined();
    hooks.forEach(function(hook) {
      expect(data1[hook]).toBe(Array.prototype[hook]);
    });

    chart.data.datasets[0].data = data1;
    chart.update();

    expect(data0._chartjs).not.toBeDefined();
    hooks.forEach(function(hook) {
      expect(data0[hook]).toBe(Array.prototype[hook]);
    });

    expect(data1._chartjs).toBeDefined();
    hooks.forEach(function(hook) {
      expect(data1[hook]).not.toBe(Array.prototype[hook]);
    });

    chart.destroy();

    expect(data1._chartjs).not.toBeDefined();
    hooks.forEach(function(hook) {
      expect(data1[hook]).toBe(Array.prototype[hook]);
    });
  });

  it('should resolve data element options to the default color', function() {
    var data0 = [0, 1, 2, 3, 4, 5];
    var oldColor = Chart.defaults.borderColor;
    Chart.defaults.borderColor = 'red';
    var chart = acquireChart({
      type: 'line',
      data: {
        datasets: [{
          data: data0
        }]
      }
    });

    var meta = chart.getDatasetMeta(0);
    expect(meta.dataset.options.borderColor).toBe('red');
    expect(meta.data[0].options.borderColor).toBe('red');

    // Reset old shared state
    Chart.defaults.borderColor = oldColor;
  });

  it('should read parsing from options when default is false', function() {
    const originalDefault = Chart.defaults.parsing;
    Chart.defaults.parsing = false;

    var chart = acquireChart({
      type: 'line',
      data: {
        datasets: [{
          data: [{t: 1, y: 0}]
        }]
      },
      options: {
        parsing: {
          xAxisKey: 't'
        }
      }
    });

    var meta = chart.getDatasetMeta(0);
    expect(meta.data[0].x).not.toBeNaN();

    // Reset old shared state
    Chart.defaults.parsing = originalDefault;
  });

  describe('resolveDataElementOptions', function() {
    it('should cache options when possible', function() {
      const chart = acquireChart({
        type: 'line',
        data: {
          datasets: [{
            data: [1, 2, 3],
          }]
        },
      });

      const controller = chart.getDatasetMeta(0).controller;

      expect(controller.enableOptionSharing).toBeTrue();

      const opts0 = controller.resolveDataElementOptions(0);
      const opts1 = controller.resolveDataElementOptions(1);

      expect(opts0 === opts1).toBeTrue();
      expect(opts0.$shared).toBeTrue();
      expect(Object.isFrozen(opts0)).toBeTrue();
    });

    it('should not cache options when option sharing is disabled', function() {
      const chart = acquireChart({
        type: 'radar',
        data: {
          datasets: [{
            data: [1, 2, 3],
          }]
        },
      });

      const controller = chart.getDatasetMeta(0).controller;

      expect(controller.enableOptionSharing).toBeFalse();

      const opts0 = controller.resolveDataElementOptions(0);
      const opts1 = controller.resolveDataElementOptions(1);

      expect(opts0 === opts1).toBeFalse();
      expect(opts0.$shared).not.toBeTrue();
      expect(Object.isFrozen(opts0)).toBeFalse();
    });

    it('should not cache options when functions are used', function() {
      const chart = acquireChart({
        type: 'line',
        data: {
          datasets: [{
            data: [1, 2, 3],
            backgroundColor: () => 'red'
          }]
        },
      });

      const controller = chart.getDatasetMeta(0).controller;

      const opts0 = controller.resolveDataElementOptions(0);
      const opts1 = controller.resolveDataElementOptions(1);

      expect(opts0 === opts1).toBeFalse();
      expect(opts0.$shared).not.toBeTrue();
      expect(Object.isFrozen(opts0)).toBeFalse();
    });
  });

  describe('_resolveAnimations', function() {
    function animationsExpectations(anims, props) {
      for (const [prop, opts] of Object.entries(props)) {
        const anim = anims._properties.get(prop);
        expect(anim).withContext(prop).toBeInstanceOf(Object);
        if (anim) {
          for (const [name, value] of Object.entries(opts)) {
            expect(anim[name]).withContext('"' + name + '" of ' + JSON.stringify(anim)).toEqual(value);
          }
        }
      }
    }

    it('should resolve to empty Animations when globally disabled', function() {
      const chart = acquireChart({
        type: 'line',
        data: {
          datasets: [{
            data: [1],
            animation: {
              test: {duration: 10}
            }
          }]
        },
        options: {
          animation: false
        }
      });

      const controller = chart.getDatasetMeta(0).controller;

      expect(controller._resolveAnimations(0)._properties.size).toEqual(0);
    });

    it('should resolve to empty Animations when disabled at dataset level', function() {
      const chart = acquireChart({
        type: 'line',
        data: {
          datasets: [{
            data: [1],
            animation: false
          }]
        }
      });

      const controller = chart.getDatasetMeta(0).controller;

      expect(controller._resolveAnimations(0)._properties.size).toEqual(0);
    });

    it('should fallback properly', function() {
      const chart = acquireChart({
        type: 'line',
        data: {
          datasets: [{
            data: [1],
            animation: {
              duration: 200
            }
          }, {
            type: 'bar',
            data: [2]
          }]
        },
        options: {
          animation: {
            delay: 100
          },
          animations: {
            x: {
              delay: 200
            }
          },
          transitions: {
            show: {
              x: {
                delay: 300
              }
            }
          },
          datasets: {
            bar: {
              animation: {
                duration: 500
              }
            }
          }
        }
      });
      const controller = chart.getDatasetMeta(0).controller;

      expect(Chart.defaults.animation.duration).toEqual(1000);

      const def0 = controller._resolveAnimations(0, 'default', false);
      animationsExpectations(def0, {
        x: {
          delay: 200,
          duration: 200
        },
        y: {
          delay: 100,
          duration: 200
        }
      });

      const controller2 = chart.getDatasetMeta(1).controller;
      const def1 = controller2._resolveAnimations(0, 'default', false);
      animationsExpectations(def1, {
        x: {
          delay: 200,
          duration: 500
        }
      });
    });
  });

  describe('getContext', function() {
    it('should reflect updated data', function() {
      var chart = acquireChart({
        type: 'scatter',
        data: {
          datasets: [{
            data: [{x: 1, y: 0}, {x: 2, y: '1'}]
          }]
        },
      });
      let meta = chart.getDatasetMeta(0);

      expect(meta.controller.getContext(undefined, true, 'test')).toEqual(jasmine.objectContaining({
        active: true,
        datasetIndex: 0,
        dataset: chart.data.datasets[0],
        index: 0,
        mode: 'test'
      }));
      expect(meta.controller.getContext(1, false, 'datatest')).toEqual(jasmine.objectContaining({
        active: false,
        datasetIndex: 0,
        dataset: chart.data.datasets[0],
        dataIndex: 1,
        element: meta.data[1],
        index: 1,
        parsed: {x: 2, y: 1},
        raw: {x: 2, y: '1'},
        mode: 'datatest'
      }));

      chart.data.datasets[0].data[1].y = 5;
      chart.update();

      expect(meta.controller.getContext(1, false, 'datatest')).toEqual(jasmine.objectContaining({
        active: false,
        datasetIndex: 0,
        dataset: chart.data.datasets[0],
        dataIndex: 1,
        element: meta.data[1],
        index: 1,
        parsed: {x: 2, y: 5},
        raw: {x: 2, y: 5},
        mode: 'datatest'
      }));

      chart.data.datasets = [{
        data: [{x: 0, y: 0}, {x: 1, y: 1}]
      }];
      chart.update();
      // meta is re-created when dataset is replaced
      meta = chart.getDatasetMeta(0);

      expect(meta.controller.getContext(undefined, false, 'test2')).toEqual(jasmine.objectContaining({
        active: false,
        datasetIndex: 0,
        dataset: chart.data.datasets[0],
        index: 0,
        mode: 'test2'
      }));
      expect(meta.controller.getContext(1, true, 'datatest2')).toEqual(jasmine.objectContaining({
        active: true,
        datasetIndex: 0,
        dataset: chart.data.datasets[0],
        dataIndex: 1,
        element: meta.data[1],
        index: 1,
        parsed: {x: 1, y: 1},
        raw: {x: 1, y: 1},
        mode: 'datatest2'
      }));
    });
  });
});
