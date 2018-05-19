import React from 'react';
import styled, { css, injectGlobal } from 'styled-components';
import reactDom from 'react-dom';

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();







var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};



var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};









var objectWithoutProperties = function (obj, keys) {
  var target = {};

  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }

  return target;
};

var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};





var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();



var taggedTemplateLiteral = function (strings, raw) {
  return Object.freeze(Object.defineProperties(strings, {
    raw: {
      value: Object.freeze(raw)
    }
  }));
};









var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

var Add = function Add(props) {
  return React.createElement(
    "svg",
    _extends({ width: 22, height: 22, viewBox: "0 0 22 22" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M0 0h22v22H0z" }),
      React.createElement("path", {
        d: "M11 4.744c1.216 0 2.341.304 3.376.912a6.308 6.308 0 0 1 2.368 2.368 6.546 6.546 0 0 1 .912 3.376 6.546 6.546 0 0 1-.912 3.376 6.308 6.308 0 0 1-2.368 2.368 6.546 6.546 0 0 1-3.376.912 6.546 6.546 0 0 1-3.376-.912 6.428 6.428 0 0 1-2.368-2.384 6.517 6.517 0 0 1-.912-3.36c0-1.205.304-2.325.912-3.36A6.55 6.55 0 0 1 7.64 5.656 6.517 6.517 0 0 1 11 4.744z",
        stroke: "currentColor"
      }),
      React.createElement("path", {
        fill: "currentColor",
        d: "M11.656 8.056v2.688h2.688v1.312h-2.688v2.688h-1.312v-2.688H7.656v-1.312h2.688V8.056z"
      })
    )
  );
};

var Apps = function Apps(props) {
  return React.createElement(
    "svg",
    _extends({ width: 22, height: 22, viewBox: "0 0 22 22" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M0 0h22v22H0z" }),
      React.createElement("path", {
        d: "M4.157 3.07C3.523 3.07 3 3.592 3 4.226v5.012c0 .635.523 1.157 1.157 1.157h5.012c.634 0 1.156-.522 1.156-1.157V4.226c0-.634-.522-1.156-1.156-1.156H4.157zm8.482 0c-.635 0-1.157.522-1.157 1.156v5.012c0 .635.522 1.157 1.157 1.157h5.012c.634 0 1.156-.522 1.156-1.157V4.226c0-.634-.522-1.156-1.156-1.156h-5.012zm-8.482.77h5.012c.22 0 .385.166.385.386v5.012c0 .22-.165.386-.385.386H4.157a.377.377 0 0 1-.386-.386V4.226c0-.22.165-.385.386-.385zm8.482 0h5.012c.22 0 .385.166.385.386v5.012c0 .22-.165.386-.385.386h-5.012a.377.377 0 0 1-.386-.386V4.226c0-.22.165-.385.386-.385zm2.463 7.706a.386.386 0 0 0-.343.391v2.892h-2.892a.386.386 0 1 0 0 .77h2.892v2.893a.386.386 0 1 0 .771 0V15.6h2.892a.386.386 0 1 0 0-.771H15.53v-2.892a.386.386 0 0 0-.428-.391zm-10.945.006c-.634 0-1.157.522-1.157 1.156v5.012c0 .635.523 1.157 1.157 1.157h5.012c.634 0 1.156-.522 1.156-1.157v-5.012c0-.634-.522-1.156-1.156-1.156H4.157zm0 .77h5.012c.22 0 .385.166.385.386v5.012c0 .22-.165.386-.385.386H4.157a.377.377 0 0 1-.386-.386v-5.012c0-.22.165-.385.386-.385z",
        fill: "currentColor",
        fillRule: "nonzero"
      })
    )
  );
};

var Blank = function Blank(props) {
  return React.createElement(
    "svg",
    _extends({ width: 22, height: 22, viewBox: "0 0 22 22" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M0 0h22v22H0z" }),
      React.createElement("path", {
        d: "M17.655 2H5.345A.357.357 0 0 0 5 2.345v16.559c0 .181.163.345.345.345h9.768c.09 0 .2-.037.254-.11l2.542-2.85a.345.345 0 0 0 .091-.236V2.345A.357.357 0 0 0 17.655 2zM5.69 2.69h11.62v12.637h-2.25a.69.69 0 0 0-.69.69v2.542H5.69V2.689zm9.369 15.742v-2.433h2.16l-2.16 2.433z",
        fill: "currentColor",
        fillRule: "nonzero"
      })
    )
  );
};

var Check = function Check(props) {
  return React.createElement(
    "svg",
    _extends({ width: 14, height: 10, viewBox: "0 0 14 10" }, props),
    React.createElement("path", {
      d: "M4.176 7.956L12.114 0l1.062 1.062-9 9L0 5.886l1.044-1.062z",
      fill: "#21D48E",
      fillRule: "evenodd"
    })
  );
};

var Cross = function Cross(props) {
  return React.createElement(
    "svg",
    _extends({ width: 11, height: 11, viewBox: "0 0 11 11" }, props),
    React.createElement("path", {
      d: "M10.476 1.524L6.3 5.7l4.176 4.176-1.062 1.062-4.176-4.176-4.176 4.176L0 9.876 4.176 5.7 0 1.524 1.062.462l4.176 4.176L9.414.462z",
      fill: "#FB7777",
      fillRule: "evenodd"
    })
  );
};

var Fundraising = function Fundraising(props) {
  return React.createElement(
    "svg",
    _extends({ width: 22, height: 22, viewBox: "0 0 22 22" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M0 0h22v22H0z" }),
      React.createElement(
        "g",
        { stroke: "currentColor" },
        React.createElement("path", {
          d: "M6 12.26C6.402 13.75 9.137 15 12.475 15 16.089 15 19 13.534 19 11.875c0-.886-1.07-1.903-2.967-2.357",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }),
        React.createElement("path", { d: "M16 6.88C16 8.536 13.1 10 9.5 10S3 8.536 3 6.88C3 5.224 5.9 4 9.5 4S16 5.224 16 6.88" }),
        React.createElement("path", {
          d: "M6 12v2c0 1.667 2.9 3 6.5 3s6.5-1.333 6.5-3v-2c0 1.643-2.9 3.095-6.5 3.095S6 13.643 6 12z",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }),
        React.createElement("path", { d: "M9.5 10.095C5.9 10.095 3 8.643 3 7v2c0 1.667 2.9 3 6.5 3S16 10.667 16 9V7c0 1.643-2.9 3.095-6.5 3.095" })
      )
    )
  );
};

var Groups = function Groups(props) {
  return React.createElement(
    "svg",
    _extends({ width: 22, height: 22, viewBox: "0 0 22 22" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M0 0h22v22H0z" }),
      React.createElement("path", {
        d: "M14.928 16.169l.395.22c.264.146.396.337.396.571v1.186a.753.753 0 0 1-.235.564.773.773 0 0 1-.556.227H4.79a.773.773 0 0 1-.557-.227.753.753 0 0 1-.234-.564V16.96c0-.215.132-.4.396-.557l.395-.234 3.032-1.64c-.556-.44-.942-1.026-1.157-1.758-.215-.733-.322-1.314-.322-1.744V9.05c0-.332.102-.662.307-.989.205-.327.474-.623.806-.886.332-.264.71-.479 1.135-.645a3.497 3.497 0 0 1 1.282-.249c.44 0 .87.083 1.29.25.419.165.793.38 1.12.644.327.263.59.559.79.886.2.327.301.657.301.989v1.977c0 .479-.095 1.075-.286 1.787-.19.713-.559 1.29-1.106 1.729l2.945 1.626zM14.78 18v-.835a.391.391 0 0 0-.102-.073l-.117-.059a.071.071 0 0 1-.037-.014.479.479 0 0 0-.051-.03l-2.945-1.626a.99.99 0 0 1-.337-.315.863.863 0 0 1-.146-.432.856.856 0 0 1 .066-.454.913.913 0 0 1 .285-.366c.4-.313.674-.76.82-1.34.147-.581.22-1.058.22-1.429V9.05c0-.342-.256-.733-.769-1.172a2.672 2.672 0 0 0-1.794-.66c-.664 0-1.262.22-1.794.66-.533.44-.799.83-.799 1.172v1.977c0 .371.088.848.264 1.429.176.58.464 1.027.864 1.34.117.098.208.22.271.366a.856.856 0 0 1 .066.454.863.863 0 0 1-.146.432.865.865 0 0 1-.337.3L5.23 17.005a.06.06 0 0 0-.029.007.115.115 0 0 0-.03.022.432.432 0 0 0-.124.059l-.11.073V18h9.844zm3.428-4.16l.395.22c.264.146.396.336.396.57v1.173a.753.753 0 0 1-.234.564.773.773 0 0 1-.557.227h-1.553a5.372 5.372 0 0 0-.183-.542.952.952 0 0 0-.3-.396h1.89v-.835a4.202 4.202 0 0 0-.103-.066.408.408 0 0 0-.117-.05.092.092 0 0 0-.037-.023.402.402 0 0 1-.051-.022l-2.988-1.626a.99.99 0 0 1-.337-.315.863.863 0 0 1-.147-.432.856.856 0 0 1 .066-.454.913.913 0 0 1 .286-.366c.4-.322.68-.774.842-1.355.161-.581.242-1.052.242-1.414V6.721c0-.352-.264-.747-.791-1.187a2.756 2.756 0 0 0-1.817-.659 2.981 2.981 0 0 0-1.787.6 2.301 2.301 0 0 0-.586-.102l-.6-.03c.341-.4.78-.737 1.318-1.01a3.608 3.608 0 0 1 1.655-.41c.44 0 .872.085 1.297.256a4.52 4.52 0 0 1 1.135.652c.332.264.6.562.806.894.205.332.307.664.307.996v1.977c0 .469-.102 1.062-.307 1.78-.205.718-.581 1.292-1.128 1.721l2.988 1.64z",
        fill: "currentColor"
      })
    )
  );
};

var Home = function Home(props) {
  return React.createElement(
    "svg",
    _extends({ width: 22, height: 22, viewBox: "0 0 22 22" }, props),
    React.createElement("path", {
      d: "M17.884 9.993c.08.085.121.198.115.314a.484.484 0 0 1-.129.312.667.667 0 0 1-.143.09.375.375 0 0 1-.157.033c-.06 0-.12-.01-.176-.033a.338.338 0 0 1-.137-.103l-.586-.614v6.53a.419.419 0 0 1-.13.307.419.419 0 0 1-.307.13h-3.052a.419.419 0 0 1-.307-.13.419.419 0 0 1-.13-.307V12.16H9.268l-.014 4.362a.419.419 0 0 1-.13.307.419.419 0 0 1-.307.13H5.78a.43.43 0 0 1-.437-.437V9.993l-.586.613a.484.484 0 0 1-.314.13.428.428 0 0 1-.312-.117.484.484 0 0 1-.13-.312.428.428 0 0 1 .116-.314L10.7 3.135a.463.463 0 0 1 .15-.102.456.456 0 0 1 .34 0 .339.339 0 0 1 .137.102l6.557 6.858zM15.8 9.147c0-.019.003-.036.013-.054l-4.799-5.016-4.81 5.016a.26.26 0 0 0 .005.054.223.223 0 0 1 .007.055v6.885h2.168l.014-4.363a.419.419 0 0 1 .129-.307.419.419 0 0 1 .307-.13h4.348a.419.419 0 0 1 .307.13c.083.08.13.191.13.307v4.363h2.18v-6.94z",
      fill: "currentColor"
    })
  );
};

var Identity = function Identity(props) {
  return React.createElement(
    "svg",
    _extends({ width: 22, height: 22, viewBox: "0 0 22 22" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M0 0h22v22H0z" }),
      React.createElement("path", {
        d: "M4.04 16.984V18h11.44v1H4.04a1.02 1.02 0 0 1-.731-.297A.943.943 0 0 1 3 18v-1.5c0-.281.173-.518.52-.71l.52-.29 4.566-2.078a3.891 3.891 0 0 1-.926-1.008 6.536 6.536 0 0 1-.61-1.21 6.431 6.431 0 0 1-.333-1.212A6.209 6.209 0 0 1 6.64 9V6.5c0-.417.135-.833.406-1.25a4.43 4.43 0 0 1 1.073-1.125 5.961 5.961 0 0 1 1.503-.813A4.82 4.82 0 0 1 11.32 3c.574 0 1.14.104 1.698.313a5.819 5.819 0 0 1 1.495.812c.439.333.796.708 1.073 1.125.276.417.414.833.414 1.25V9c0 .302-.032.651-.098 1.047a6.59 6.59 0 0 1-.324 1.21 5.86 5.86 0 0 1-.602 1.188 4.13 4.13 0 0 1-.91.992l1.381.61-.26 1-1.56-.703a1.045 1.045 0 0 1-.406-.32.958.958 0 0 1-.195-.477c-.01-.177.016-.344.082-.5a1.03 1.03 0 0 1 .308-.406c.564-.417.962-1.008 1.195-1.774.233-.765.349-1.388.349-1.867V6.5c0-.27-.108-.552-.325-.844a3.757 3.757 0 0 0-.837-.804 4.941 4.941 0 0 0-1.162-.61A3.744 3.744 0 0 0 11.32 4c-.444 0-.883.08-1.316.242a4.932 4.932 0 0 0-1.17.617 3.65 3.65 0 0 0-.837.813c-.211.292-.317.568-.317.828V9c0 .49.127 1.115.382 1.875.254.76.653 1.349 1.194 1.766a.969.969 0 0 1 .195 1.367c-.108.14-.243.247-.406.32l-4.566 2.078a1.041 1.041 0 0 0-.268.157c-.114.083-.171.223-.171.421zM18.5 16a.48.48 0 0 1 .352.148.48.48 0 0 1 .148.352.48.48 0 0 1-.148.352.48.48 0 0 1-.352.148H17v1.5a.48.48 0 0 1-.148.352.48.48 0 0 1-.352.148.48.48 0 0 1-.352-.148A.48.48 0 0 1 16 18.5V17h-1.5a.48.48 0 0 1-.352-.148A.48.48 0 0 1 14 16.5a.48.48 0 0 1 .148-.352A.48.48 0 0 1 14.5 16H16v-1.5a.48.48 0 0 1 .148-.352A.48.48 0 0 1 16.5 14a.48.48 0 0 1 .352.148.48.48 0 0 1 .148.352V16h1.5z",
        fill: "currentColor"
      })
    )
  );
};

var Notifications = function Notifications(props) {
  return React.createElement(
    "svg",
    _extends({ width: 22, height: 22, viewBox: "0 0 22 22" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M0 0h22v22H0z" }),
      React.createElement("path", {
        d: "M17.271 13.367c.254.313.455.591.601.835a.731.731 0 0 1 .044.733.718.718 0 0 1-.571.424c-.264.04-.469.059-.616.059H13.99c0 .693-.244 1.284-.732 1.772a2.414 2.414 0 0 1-1.773.733 2.414 2.414 0 0 1-1.772-.733 2.414 2.414 0 0 1-.733-1.772H6.3c-.225 0-.457-.027-.696-.08a.732.732 0 0 1-.52-.403c-.117-.245-.107-.496.03-.755a6.56 6.56 0 0 1 .556-.857c.264-.342.552-.73.864-1.164.313-.435.469-.887.469-1.355V7.742c0-.664.115-1.286.344-1.867.23-.582.545-1.09.945-1.524.4-.434.874-.776 1.42-1.025a4.191 4.191 0 0 1 1.759-.374c.634 0 1.225.125 1.772.374a4.46 4.46 0 0 1 1.428 1.025c.406.435.723.942.953 1.524a5.04 5.04 0 0 1 .344 1.867v3.062c0 .478.149.942.447 1.391.297.45.583.84.856 1.172zm-5.786 3.574c.42 0 .78-.149 1.077-.446.298-.298.447-.657.447-1.077H9.962c0 .42.149.779.447 1.077.298.297.656.446 1.076.446zm5.347-2.52a8.139 8.139 0 0 0-.337-.425c-.322-.39-.657-.856-1.003-1.398a3.262 3.262 0 0 1-.52-1.794V7.742c0-.527-.09-1.02-.271-1.48a3.85 3.85 0 0 0-.74-1.2 3.511 3.511 0 0 0-1.106-.813c-.425-.2-.886-.3-1.384-.3-.489 0-.945.1-1.37.3-.425.2-.793.47-1.106.813a3.744 3.744 0 0 0-.732 1.2 4.102 4.102 0 0 0-.264 1.48v3.062c0 .634-.183 1.218-.55 1.75a46.606 46.606 0 0 1-1.157 1.619c-.063.088-.12.17-.168.249h10.708z",
        fill: "currentColor"
      })
    )
  );
};

var Permissions = function Permissions(props) {
  return React.createElement(
    "svg",
    _extends({ width: 22, height: 22, viewBox: "0 0 22 22" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M0 0h22v22H0z" }),
      React.createElement(
        "g",
        { stroke: "currentColor" },
        React.createElement("path", {
          d: "M11.036 3.143L3.578 6.357V7.43h14.916V6.357l-7.458-3.214zm6.88 12.393H4.071c-.318 0-.577.242-.577.535v1.072h15V16.07c0-.293-.26-.535-.578-.535z",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }),
        React.createElement("path", { d: "M5 7v8.034M8 7v8.275M11 7v8.034M14 7v8.275M17 7v8.275" })
      )
    )
  );
};

var Settings = function Settings(props) {
  return React.createElement(
    "svg",
    _extends({ width: 22, height: 22, viewBox: "0 0 22 22" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M0 0h22v22H0z" }),
      React.createElement("path", {
        d: "M18.063 9.08c.224.038.437.148.637.329.2.18.3.403.3.666v.938c0 .254-.1.459-.3.615-.2.156-.413.264-.637.322l-1.216.293a6.84 6.84 0 0 1-.154.418 4.008 4.008 0 0 1-.183.388l.644 1.084c.127.195.205.42.235.674a.766.766 0 0 1-.235.659l-.659.659a.847.847 0 0 1-.674.256 1.38 1.38 0 0 1-.688-.212l-1.055-.674a7.697 7.697 0 0 1-.41.19 4.595 4.595 0 0 1-.44.162l-.263 1.216a1.29 1.29 0 0 1-.33.637c-.18.2-.403.3-.666.3h-.938a.743.743 0 0 1-.615-.3 1.749 1.749 0 0 1-.322-.637L9.8 15.86a6.001 6.001 0 0 1-.469-.168 4.816 4.816 0 0 1-.454-.213l-1.084.689a1.308 1.308 0 0 1-.681.212.813.813 0 0 1-.667-.256l-.674-.66a.785.785 0 0 1-.22-.658c.03-.254.103-.479.22-.674l.689-1.143a8.068 8.068 0 0 1-.169-.359 3.029 3.029 0 0 1-.139-.388l-1.215-.293a1.749 1.749 0 0 1-.638-.322.743.743 0 0 1-.3-.615v-.938c0-.263.1-.486.3-.666.2-.181.413-.29.638-.33l1.2-.264a3.44 3.44 0 0 1 .147-.41c.059-.136.117-.268.176-.395l-.689-1.143a1.664 1.664 0 0 1-.22-.674.785.785 0 0 1 .22-.659l.674-.659a.813.813 0 0 1 .667-.256c.268.014.495.085.68.212l1.085.689a5.325 5.325 0 0 1 .908-.381l.308-1.202a1.58 1.58 0 0 1 .307-.637.76.76 0 0 1 .63-.3h.938c.263 0 .483.1.659.3.176.2.288.408.337.623l.264 1.23a6.533 6.533 0 0 1 .85.352l1.054-.674a1.38 1.38 0 0 1 .688-.212.847.847 0 0 1 .674.256l.66.66a.766.766 0 0 1 .234.658 1.55 1.55 0 0 1-.235.674l-.644 1.084c.068.137.134.276.198.418.063.141.114.29.153.446l1.201.264zm0 1.86l.014-.836a.515.515 0 0 0-.205-.102l-1.743-.396-.161-.512a2.474 2.474 0 0 0-.117-.352 4.109 4.109 0 0 0-.176-.366l-.235-.469.923-1.538a.474.474 0 0 0 .066-.117.28.28 0 0 0 .022-.088l-.615-.6a.348.348 0 0 0-.19.058l-1.51.967-.483-.25a11.505 11.505 0 0 0-.351-.168 1.904 1.904 0 0 0-.366-.124l-.513-.176-.381-1.772a.431.431 0 0 0-.044-.11l-.03-.051h-.864a.34.34 0 0 0-.058.087.52.52 0 0 0-.044.147l-.425 1.7-.498.16a4.51 4.51 0 0 0-.762.322l-.483.25-1.567-.997-.074-.036a.671.671 0 0 0-.088-.037l-.615.615c0 .03.008.064.022.103a.898.898 0 0 0 .066.132l.952 1.582-.234.454a8.76 8.76 0 0 0-.154.351 2.79 2.79 0 0 0-.11.323l-.16.512-1.773.396a.537.537 0 0 0-.096.044.199.199 0 0 1-.066.03v.863c.02.02.05.037.088.052a.81.81 0 0 0 .147.036l1.714.44.16.498a3.144 3.144 0 0 0 .265.615l.22.454-.953 1.597a.474.474 0 0 0-.066.117.298.298 0 0 0-.022.103l.615.6c.03 0 .062-.007.096-.022a.59.59 0 0 0 .095-.051l1.538-.982.483.25a4.51 4.51 0 0 0 .762.322l.498.16.44 1.73c.01.048.022.09.036.124a.254.254 0 0 0 .051.08h.85a.515.515 0 0 0 .103-.19l.38-1.743.513-.176a5.14 5.14 0 0 0 .703-.293l.484-.249 1.538.982.073.036a.72.72 0 0 0 .088.037l.615-.615a.298.298 0 0 0-.022-.103.826.826 0 0 0-.066-.132l-.923-1.523.235-.469c.058-.107.11-.217.154-.33.044-.112.085-.227.124-.344l.161-.483 1.743-.44a.635.635 0 0 0 .125-.036.254.254 0 0 0 .08-.052zM11.5 7.687c.781 0 1.448.273 2 .82a2.7 2.7 0 0 1 .827 1.992 2.7 2.7 0 0 1-.827 1.992 2.737 2.737 0 0 1-2 .82 2.72 2.72 0 0 1-1.985-.82 2.7 2.7 0 0 1-.828-1.992 2.7 2.7 0 0 1 .828-1.992 2.72 2.72 0 0 1 1.985-.82zm0 4.687c.518 0 .96-.183 1.326-.55.366-.366.549-.807.549-1.325 0-.518-.183-.96-.55-1.326a1.806 1.806 0 0 0-1.325-.549c-.518 0-.96.183-1.326.55a1.804 1.804 0 0 0-.549 1.325c0 .518.183.96.55 1.326.366.366.807.549 1.325.549z",
        fill: "currentColor"
      })
    )
  );
};

var Share = function Share(props) {
  return React.createElement(
    "svg",
    _extends({ width: 16, height: 14, viewBox: "0 0 16 14" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M-3-4h22v22H-3z" }),
      React.createElement("path", {
        d: "M.531 13.719a.44.44 0 0 1-.312-.117.522.522 0 0 1-.157-.305c0-.042-.018-.3-.054-.774-.037-.474-.013-1.054.07-1.742.083-.687.258-1.43.524-2.226A6.74 6.74 0 0 1 1.89 6.313 6.89 6.89 0 0 1 3.125 5.18a7.514 7.514 0 0 1 1.523-.836 9.899 9.899 0 0 1 1.797-.54c.64-.13 1.326-.205 2.055-.226L8.516.781a.48.48 0 0 1 .078-.273.52.52 0 0 1 .203-.18.537.537 0 0 1 .281-.047c.094.01.177.047.25.11l6.485 5.312a.513.513 0 0 1 .187.39.498.498 0 0 1-.188.391L9.329 11.86a.453.453 0 0 1-.25.11.537.537 0 0 1-.281-.047.501.501 0 0 1-.203-.188.493.493 0 0 1-.078-.265L8.5 8.594c-1.75 0-3.125.234-4.125.703s-1.75.99-2.25 1.562c-.5.573-.815 1.107-.945 1.602-.13.495-.196.763-.196.805a.538.538 0 0 1-.132.32.387.387 0 0 1-.305.133H.53zm8.485-6.125c.062 0 .125.013.187.039a.72.72 0 0 1 .172.101.777.777 0 0 1 .102.164.473.473 0 0 1 .039.196v2.312l5.203-4.312-5.203-4.266v2.25a.48.48 0 0 1-.149.352.48.48 0 0 1-.351.148c-.709 0-1.375.05-2 .149a8.793 8.793 0 0 0-1.743.453 7.012 7.012 0 0 0-1.46.75 5.65 5.65 0 0 0-1.157 1.039 6.162 6.162 0 0 0-1.148 1.89 8.291 8.291 0 0 0-.492 1.922c.27-.375.604-.752 1-1.133.395-.38.903-.72 1.523-1.023.62-.302 1.375-.55 2.266-.742.89-.193 1.96-.29 3.21-.29z",
        fill: "currentColor"
      })
    )
  );
};

var Time = function Time(props) {
  return React.createElement(
    "svg",
    _extends({ width: 13, height: 13, viewBox: "0 0 13 13" }, props),
    React.createElement("path", {
      d: "M6.5 11.76c.8 0 1.535-.2 2.205-.6.66-.39 1.185-.92 1.575-1.59.39-.67.585-1.405.585-2.205S10.67 5.83 10.28 5.16a4.403 4.403 0 0 0-1.575-1.575A4.305 4.305 0 0 0 6.5 3c-.8 0-1.535.195-2.205.585-.66.39-1.185.915-1.575 1.575a4.305 4.305 0 0 0-.585 2.205c0 .8.195 1.535.585 2.205.39.67.915 1.2 1.575 1.59.67.4 1.405.6 2.205.6zm0-10.02c1.03 0 1.98.255 2.85.765.85.49 1.52 1.16 2.01 2.01.51.87.765 1.82.765 2.85s-.255 1.98-.765 2.85c-.49.85-1.16 1.52-2.01 2.01-.87.51-1.82.765-2.85.765s-1.98-.255-2.85-.765a5.386 5.386 0 0 1-2.01-2.01 5.535 5.535 0 0 1-.765-2.85c0-1.03.255-1.98.765-2.85.49-.85 1.16-1.52 2.01-2.01.87-.51 1.82-.765 2.85-.765zm.33 2.52v3.315L9.32 9.06l-.51.765L5.885 8.01V4.26h.945zM3.95 1.395l-2.895 2.37L.26 2.82 3.125.45l.825.945zm8.79 1.425l-.795.945-2.895-2.46.825-.945 2.865 2.46z",
      fill: "#6D777B",
      fillRule: "evenodd",
      opacity: 0.75
    })
  );
};

var Wallet = function Wallet(props) {
  return React.createElement(
    "svg",
    _extends({ width: 22, height: 22, viewBox: "0 0 22 22" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M0 0h22v22H0z" }),
      React.createElement("path", {
        d: "M19 7.186v8.642c0 .39-.137.723-.41.996-.274.274-.606.41-.996.41H5.406c-.39 0-.722-.136-.996-.41a1.356 1.356 0 0 1-.41-.996v-7.5c0-.38.137-.708.41-.981.274-.274.6-.415.982-.425h.468V5.047c0-.39.14-.723.418-.996a1.36 1.36 0 0 1 .989-.41l10.59 2.109c.528.146.85.38.967.703.117.322.176.567.176.733zM6.798 5.046v1.876h10.327c.186.01.308-.03.366-.117l.088-.132L7.237 4.578a.467.467 0 0 0-.44.469zm11.264 10.782V7.391c0 .156-.1.273-.3.351-.2.078-.412.117-.637.117H5.406a.45.45 0 0 0-.33.14.45.45 0 0 0-.138.33v7.5a.45.45 0 0 0 .139.329.45.45 0 0 0 .33.139h12.187a.45.45 0 0 0 .33-.14.45.45 0 0 0 .139-.329zm-11.25-4.687c.254 0 .474.092.66.278a.901.901 0 0 1 .278.66.894.894 0 0 1-.278.666.913.913 0 0 1-.66.27.906.906 0 0 1-.666-.27.906.906 0 0 1-.271-.667c0-.254.09-.474.271-.66a.894.894 0 0 1 .667-.277z",
        fill: "currentColor"
      })
    )
  );
};

/* eslint-disable prettier/prettier */

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};



function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var getDisplayName_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getDisplayName;
function getDisplayName(Component) {
  return Component.displayName || Component.name || (typeof Component === 'string' && Component.length > 0 ? Component : 'Unknown');
}
});

var getDisplayName = unwrapExports(getDisplayName_1);

// Higher-order component for convenient subscriptions to RxJS observables
var observe = function observe(_observe) {
  var initialState = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return function (Component) {
    var _class, _temp2;

    return _temp2 = _class = function (_React$Component) {
      inherits(_class, _React$Component);

      function _class() {
        var _ref;

        var _temp, _this, _ret;

        classCallCheck(this, _class);

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = _class.__proto__ || Object.getPrototypeOf(_class)).call.apply(_ref, [this].concat(args))), _this), _this.state = initialState, _this.subscribe = function (observable) {
          if (observable) {
            _this.setState({
              subscription: _observe(observable).subscribe(function (state) {
                _this.setState(state);
              })
            });
          }
        }, _this.unsubscribe = function () {
          _this.state.subscription && _this.state.subscription.unsubscribe();
        }, _temp), possibleConstructorReturn(_this, _ret);
      }

      createClass(_class, [{
        key: 'componentDidMount',
        value: function componentDidMount() {
          this.subscribe(this.props.observable);
        }
      }, {
        key: 'componentWillReceiveProps',
        value: function componentWillReceiveProps(_ref2) {
          var nextObservable = _ref2.observable;
          var observable = this.props.observable;
          // If a new observable gets passed in, unsubscribe from the old and subscribe to the new

          if (nextObservable !== observable) {
            this.unsubscribe();
            this.subscribe(nextObservable);
          }
        }
      }, {
        key: 'componentWillUnmount',
        value: function componentWillUnmount() {
          this.unsubscribe();
        }
      }, {
        key: 'render',
        value: function render() {
          var props = objectWithoutProperties(this.props, []);
          // Don't pass down the given observable

          delete props.observable;

          return React.createElement(Component, _extends({}, this.state, props));
        }
      }]);
      return _class;
    }(React.Component), _class.displayName = 'Observe(' + getDisplayName(Component) + ')', _class.propTypes = {
      observable: function observable(_ref3, _, componentName) {
        var _observable = _ref3.observable;

        if (_observable && typeof _observable.subscribe !== 'function') {
          throw new Error('Invalid prop `observable` supplied to `' + componentName + '` ' + '(wrapped by `observe()`). ' + '`observable` must be an RxJS Observable-like object. ' + ('Given ' + _observable + ' instead.'));
        }
      }
    }, _temp2;
  };
};

var aragon = {
  Grey: {
    'Black Ash': '#3B3B3B',
    'Dim Grey': '#707070',
    'Dust Grey': '#969696',
    'Light Grey': '#B3B3B3',
    Gainsboro: '#E6E6E6',
    Alabaster: '#F2F2F2'
  },
  Rain: {
    Shark: '#1F2323',
    Atomic: '#455559',
    Slate: '#6D8088',
    'Aqua Island': '#9ECDDB',
    'Rain Sky': '#DCEAEF',
    'Aqua Blue': '#F7FBFD'
  },
  Blue: {
    Lochmara: '#028BCF',
    Danube: '#7FADDC',
    Spindle: '#B3CFEA',
    Solitude: '#ECF8FE'
  },
  Sea: {
    'Light Sea': '#21B7C4',
    Turquoise: '#50E2C3',
    'Blizzard Blue': '#ACECE7'
  },
  Purple: {
    Indigo: '#4A2DBE',
    Portage: '#A684F5',
    Lavender: '#EDE5FF'
  },
  Eagle: {
    'Dark Cerulean': '#00A4D1',
    Cerulean: '#00B4E6',
    'Dark Turquoise': '#00CBE6',
    'Dark Opal': '#00DBCD',
    Opal: '#00F0E0'
  },
  Gold: {
    Brandy: '#DAC08B',
    Beige: '#FFF9EB'
  },
  Red: {
    'Salmon Red': '#FB7979'
  },
  Green: {
    'Spring Green': '#21D48F'
  },
  Black: {
    Black: '#000000'
  },
  White: {
    White: '#FFFFFF'
  },
  'Aragon Brand': {
    Primary: '=Purple.Indigo',
    Secondary: '=Sea.Turquoise',
    'Black Ash': '=Grey.Black Ash',
    'Gradient Start': '=Eagle.Cerulean',
    'Gradient End': '=Eagle.Opal'
  },
  'Aragon UI': {
    gradientStart: '=Eagle.Cerulean',
    gradientEnd: '=Eagle.Opal',
    gradientStartActive: '=Eagle.Dark Cerulean',
    gradientEndActive: '=Eagle.Dark Opal',
    gradientText: '=White.White',
    mainBackground: '=Rain.Aqua Blue',
    mainBgGradientStart: '=Rain.Rain Sky',
    mainBgGradientEnd: '=Rain.Aqua Blue',
    secondaryBackground: '=Rain.Rain Sky',
    contentBackground: '=White.White',
    contentBackgroundActive: '=Grey.Alabaster',
    contentBorder: '=Grey.Gainsboro',
    contentBorderActive: '=Grey.Light Grey',
    disabled: '=Grey.Gainsboro',
    disabledText: '=White.White',
    infoBackground: '=Blue.Solitude',
    infoPermissionsBackground: '=Gold.Beige',
    infoPermissionsIcon: '=Gold.Brandy',
    shadow: '=Grey.Alabaster',
    text: '=Black.Black',
    textPrimary: '=Aragon UI.text',
    textDimmed: '=Grey.Black Ash',
    textSecondary: '=Grey.Dim Grey',
    textTertiary: '=Grey.Light Grey',
    accent: '=Eagle.Dark Turquoise',
    positive: '=Green.Spring Green',
    positiveText: '=White.White',
    negative: '=Red.Salmon Red',
    negativeText: '=White.White',
    badgeAppBackground: '=Purple.Lavender',
    badgeAppForeground: '=Purple.Portage',
    badgeIdentityBackground: '=Rain.Rain Sky',
    badgeIdentityForeground: '=Rain.Slate',
    badgeNotificationBackground: '=Aragon UI.positive',
    badgeNotificationForeground: '=Aragon UI.positiveText',
    badgeInfoBackground: '=Rain.Rain Sky',
    badgeInfoForeground: '=Rain.Slate'
  },
  'Aragon UI Dark': {
    gradientStart: '=Eagle.Cerulean',
    gradientEnd: '=Eagle.Opal',
    gradientStartActive: '=Eagle.Dark Cerulean',
    gradientEndActive: '=Eagle.Dark Opal',
    gradientText: '=White.White',
    mainBackground: '=Rain.Aqua Blue',
    mainBgGradientStart: '=Rain.Rain Sky',
    mainBgGradientEnd: '=Rain.Aqua Blue',
    secondaryBackground: '=Rain.Rain Sky',
    contentBackground: '=Rain.Shark',
    contentBackgroundActive: '=Grey.Alabaster',
    contentBorder: '=Grey.Gainsboro',
    contentBorderActive: '=Grey.Light Grey',
    disabled: '=Grey.Light Grey',
    disabledText: '=Grey.Dim Grey',
    infoBackground: '=Blue.Solitude',
    infoPermissionsBackground: '=Gold.Beige',
    infoPermissionsIcon: '=Gold.Brandy',
    shadow: '=Grey.Alabaster',
    text: '=White.White',
    textPrimary: '=Aragon UI Dark.text',
    textDimmed: '=Grey.Alabaster',
    textSecondary: '=Grey.Dust Grey',
    textTertiary: '=Grey.Dim Grey',
    accent: '=Eagle.Dark Turquoise',
    positive: '=Green.Spring Green',
    positiveText: '=White.White',
    negative: '=Red.Salmon Red',
    negativeText: '=White.White',
    badgeAppBackground: '=Purple.Lavender',
    badgeAppForeground: '=Purple.Portage',
    badgeIdentityBackground: '=Rain.Rain Sky',
    badgeIdentityForeground: '=Rain.Slate',
    badgeNotificationBackground: '=Aragon UI Dark.positive',
    badgeNotificationForeground: '=Aragon UI Dark.positiveText',
    badgeInfoBackground: '=Rain.Rain Sky',
    badgeInfoForeground: '=Rain.Slate'
  }
};


// These need to match the names in the Open Color palettes
var THEME_NAME = 'Aragon UI';
var THEME_DARK_NAME = 'Aragon UI Dark';
var BRAND_NAME = 'Aragon Brand';

// Name of the group a given palette belong to
var getGroupName = function getGroupName(name) {
  if (name === THEME_NAME) return 'theme';
  if (name === THEME_DARK_NAME) return 'themeDark';
  if (name === BRAND_NAME) return 'brand';
  return 'colors';
};

// Resolve a single color
var resolveColor = function resolveColor(value, palettes) {
  // already resolved color
  if (!value.startsWith('=')) {
    return value;
  }

  var _value$slice$split = value.slice(1).split('.'),
      _value$slice$split2 = slicedToArray(_value$slice$split, 2),
      paletteName = _value$slice$split2[0],
      key = _value$slice$split2[1];

  var color = palettes[paletteName] && palettes[paletteName][key];

  if (!color) {
    throw new Error('resolveColor: ' + value + ' doesn\u2019t seem to exist');
  }

  // follow the references until we find one
  if (color.startsWith('=')) {
    return resolveColor(color, palettes);
  }
  return color;
};

// Resolve all the colors in a palette
var resolveColors = function resolveColors(palette, palettes) {
  return Object.entries(palette).reduce(function (pal, _ref) {
    var _ref2 = slicedToArray(_ref, 2),
        name = _ref2[0],
        value = _ref2[1];

    if (typeof value === 'string') {
      pal[name] = resolveColor(value, palettes);
    }
    return pal;
  }, {});
};

// Prepare groups from the palettes: theme, themeDark, brand and colors.
var groups = function groups(palettes) {
  return Object.entries(palettes).reduce(function (groups, _ref3) {
    var _ref4 = slicedToArray(_ref3, 2),
        paletteName = _ref4[0],
        palette = _ref4[1];

    var groupName = getGroupName(paletteName);

    if (groupName === 'colors') {
      groups.colors[paletteName] = resolveColors(palette, palettes);
    } else {
      groups[groupName] = resolveColors(palette, palettes);
    }

    return groups;
  }, { colors: {} });
};

var _groups = groups(aragon);
var themeDark = _groups.themeDark;
var theme = _groups.theme;
var brand = _groups.brand;
var colors = _groups.colors;

var MILLISECONDS_IN_HOUR = 3600000;
var MILLISECONDS_IN_MINUTE = 60000;
var DEFAULT_ADDITIONAL_DIGITS = 2;

var patterns = {
  dateTimeDelimeter: /[T ]/,
  plainTime: /:/,

  // year tokens
  YY: /^(\d{2})$/,
  YYY: [
    /^([+-]\d{2})$/, // 0 additional digits
    /^([+-]\d{3})$/, // 1 additional digit
    /^([+-]\d{4})$/ // 2 additional digits
  ],
  YYYY: /^(\d{4})/,
  YYYYY: [
    /^([+-]\d{4})/, // 0 additional digits
    /^([+-]\d{5})/, // 1 additional digit
    /^([+-]\d{6})/ // 2 additional digits
  ],

  // date tokens
  MM: /^-(\d{2})$/,
  DDD: /^-?(\d{3})$/,
  MMDD: /^-?(\d{2})-?(\d{2})$/,
  Www: /^-?W(\d{2})$/,
  WwwD: /^-?W(\d{2})-?(\d{1})$/,

  HH: /^(\d{2}([.,]\d*)?)$/,
  HHMM: /^(\d{2}):?(\d{2}([.,]\d*)?)$/,
  HHMMSS: /^(\d{2}):?(\d{2}):?(\d{2}([.,]\d*)?)$/,

  // timezone tokens
  timezone: /([Z+-].*)$/,
  timezoneZ: /^(Z)$/,
  timezoneHH: /^([+-])(\d{2})$/,
  timezoneHHMM: /^([+-])(\d{2}):?(\d{2})$/
};

/**
 * @name toDate
 * @category Common Helpers
 * @summary Convert the given argument to an instance of Date.
 *
 * @description
 * Convert the given argument to an instance of Date.
 *
 * If the argument is an instance of Date, the function returns its clone.
 *
 * If the argument is a number, it is treated as a timestamp.
 *
 * If an argument is a string, the function tries to parse it.
 * Function accepts complete ISO 8601 formats as well as partial implementations.
 * ISO 8601: http://en.wikipedia.org/wiki/ISO_8601
 *
 * If the argument is null, it is treated as an invalid date.
 *
 * If all above fails, the function passes the given argument to Date constructor.
 *
 * **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
 * All *date-fns* functions will throw `RangeError` if `options.additionalDigits` is not 0, 1, 2 or undefined.
 *
 * @param {*} argument - the value to convert
 * @param {Options} [options] - the object with options. See [Options]{@link https://date-fns.org/docs/Options}
 * @param {0|1|2} [options.additionalDigits=2] - the additional number of digits in the extended year format
 * @returns {Date} the parsed date in the local time zone
 * @throws {TypeError} 1 argument required
 * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
 *
 * @example
 * // Convert string '2014-02-11T11:30:30' to date:
 * var result = toDate('2014-02-11T11:30:30')
 * //=> Tue Feb 11 2014 11:30:30
 *
 * @example
 * // Convert string '+02014101' to date,
 * // if the additional number of digits in the extended year format is 1:
 * var result = toDate('+02014101', {additionalDigits: 1})
 * //=> Fri Apr 11 2014 00:00:00
 */
function toDate (argument, dirtyOptions) {
  if (arguments.length < 1) {
    throw new TypeError('1 argument required, but only ' + arguments.length + ' present')
  }

  if (argument === null) {
    return new Date(NaN)
  }

  var options = dirtyOptions || {};

  var additionalDigits = options.additionalDigits === undefined ? DEFAULT_ADDITIONAL_DIGITS : Number(options.additionalDigits);
  if (additionalDigits !== 2 && additionalDigits !== 1 && additionalDigits !== 0) {
    throw new RangeError('additionalDigits must be 0, 1 or 2')
  }

  // Clone the date
  if (argument instanceof Date) {
    // Prevent the date to lose the milliseconds when passed to new Date() in IE10
    return new Date(argument.getTime())
  } else if (typeof argument !== 'string') {
    return new Date(argument)
  }

  var dateStrings = splitDateString(argument);

  var parseYearResult = parseYear(dateStrings.date, additionalDigits);
  var year = parseYearResult.year;
  var restDateString = parseYearResult.restDateString;

  var date = parseDate(restDateString, year);

  if (date) {
    var timestamp = date.getTime();
    var time = 0;
    var offset;

    if (dateStrings.time) {
      time = parseTime(dateStrings.time);
    }

    if (dateStrings.timezone) {
      offset = parseTimezone(dateStrings.timezone);
    } else {
      // get offset accurate to hour in timezones that change offset
      offset = new Date(timestamp + time).getTimezoneOffset();
      offset = new Date(timestamp + time + offset * MILLISECONDS_IN_MINUTE).getTimezoneOffset();
    }

    return new Date(timestamp + time + offset * MILLISECONDS_IN_MINUTE)
  } else {
    return new Date(argument)
  }
}

function splitDateString (dateString) {
  var dateStrings = {};
  var array = dateString.split(patterns.dateTimeDelimeter);
  var timeString;

  if (patterns.plainTime.test(array[0])) {
    dateStrings.date = null;
    timeString = array[0];
  } else {
    dateStrings.date = array[0];
    timeString = array[1];
  }

  if (timeString) {
    var token = patterns.timezone.exec(timeString);
    if (token) {
      dateStrings.time = timeString.replace(token[1], '');
      dateStrings.timezone = token[1];
    } else {
      dateStrings.time = timeString;
    }
  }

  return dateStrings
}

function parseYear (dateString, additionalDigits) {
  var patternYYY = patterns.YYY[additionalDigits];
  var patternYYYYY = patterns.YYYYY[additionalDigits];

  var token;

  // YYYY or ±YYYYY
  token = patterns.YYYY.exec(dateString) || patternYYYYY.exec(dateString);
  if (token) {
    var yearString = token[1];
    return {
      year: parseInt(yearString, 10),
      restDateString: dateString.slice(yearString.length)
    }
  }

  // YY or ±YYY
  token = patterns.YY.exec(dateString) || patternYYY.exec(dateString);
  if (token) {
    var centuryString = token[1];
    return {
      year: parseInt(centuryString, 10) * 100,
      restDateString: dateString.slice(centuryString.length)
    }
  }

  // Invalid ISO-formatted year
  return {
    year: null
  }
}

function parseDate (dateString, year) {
  // Invalid ISO-formatted year
  if (year === null) {
    return null
  }

  var token;
  var date;
  var month;
  var week;

  // YYYY
  if (dateString.length === 0) {
    date = new Date(0);
    date.setUTCFullYear(year);
    return date
  }

  // YYYY-MM
  token = patterns.MM.exec(dateString);
  if (token) {
    date = new Date(0);
    month = parseInt(token[1], 10) - 1;
    date.setUTCFullYear(year, month);
    return date
  }

  // YYYY-DDD or YYYYDDD
  token = patterns.DDD.exec(dateString);
  if (token) {
    date = new Date(0);
    var dayOfYear = parseInt(token[1], 10);
    date.setUTCFullYear(year, 0, dayOfYear);
    return date
  }

  // YYYY-MM-DD or YYYYMMDD
  token = patterns.MMDD.exec(dateString);
  if (token) {
    date = new Date(0);
    month = parseInt(token[1], 10) - 1;
    var day = parseInt(token[2], 10);
    date.setUTCFullYear(year, month, day);
    return date
  }

  // YYYY-Www or YYYYWww
  token = patterns.Www.exec(dateString);
  if (token) {
    week = parseInt(token[1], 10) - 1;
    return dayOfISOYear(year, week)
  }

  // YYYY-Www-D or YYYYWwwD
  token = patterns.WwwD.exec(dateString);
  if (token) {
    week = parseInt(token[1], 10) - 1;
    var dayOfWeek = parseInt(token[2], 10) - 1;
    return dayOfISOYear(year, week, dayOfWeek)
  }

  // Invalid ISO-formatted date
  return null
}

function parseTime (timeString) {
  var token;
  var hours;
  var minutes;

  // hh
  token = patterns.HH.exec(timeString);
  if (token) {
    hours = parseFloat(token[1].replace(',', '.'));
    return (hours % 24) * MILLISECONDS_IN_HOUR
  }

  // hh:mm or hhmm
  token = patterns.HHMM.exec(timeString);
  if (token) {
    hours = parseInt(token[1], 10);
    minutes = parseFloat(token[2].replace(',', '.'));
    return (hours % 24) * MILLISECONDS_IN_HOUR +
      minutes * MILLISECONDS_IN_MINUTE
  }

  // hh:mm:ss or hhmmss
  token = patterns.HHMMSS.exec(timeString);
  if (token) {
    hours = parseInt(token[1], 10);
    minutes = parseInt(token[2], 10);
    var seconds = parseFloat(token[3].replace(',', '.'));
    return (hours % 24) * MILLISECONDS_IN_HOUR +
      minutes * MILLISECONDS_IN_MINUTE +
      seconds * 1000
  }

  // Invalid ISO-formatted time
  return null
}

function parseTimezone (timezoneString) {
  var token;
  var absoluteOffset;

  // Z
  token = patterns.timezoneZ.exec(timezoneString);
  if (token) {
    return 0
  }

  // ±hh
  token = patterns.timezoneHH.exec(timezoneString);
  if (token) {
    absoluteOffset = parseInt(token[2], 10) * 60;
    return (token[1] === '+') ? -absoluteOffset : absoluteOffset
  }

  // ±hh:mm or ±hhmm
  token = patterns.timezoneHHMM.exec(timezoneString);
  if (token) {
    absoluteOffset = parseInt(token[2], 10) * 60 + parseInt(token[3], 10);
    return (token[1] === '+') ? -absoluteOffset : absoluteOffset
  }

  return 0
}

function dayOfISOYear (isoYear, week, day) {
  week = week || 0;
  day = day || 0;
  var date = new Date(0);
  date.setUTCFullYear(isoYear, 0, 4);
  var fourthOfJanuaryDay = date.getUTCDay() || 7;
  var diff = week * 7 + day + 1 - fourthOfJanuaryDay;
  date.setUTCDate(date.getUTCDate() + diff);
  return date
}

function cloneObject (dirtyObject) {
  dirtyObject = dirtyObject || {};
  var object = {};

  for (var property in dirtyObject) {
    if (dirtyObject.hasOwnProperty(property)) {
      object[property] = dirtyObject[property];
    }
  }

  return object
}

/**
 * @name differenceInMilliseconds
 * @category Millisecond Helpers
 * @summary Get the number of milliseconds between the given dates.
 *
 * @description
 * Get the number of milliseconds between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @param {Options} [options] - the object with options. See [Options]{@link https://date-fns.org/docs/Options}
 * @param {0|1|2} [options.additionalDigits=2] - passed to `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
 * @returns {Number} the number of milliseconds
 * @throws {TypeError} 2 arguments required
 * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
 *
 * @example
 * // How many milliseconds are between
 * // 2 July 2014 12:30:20.600 and 2 July 2014 12:30:21.700?
 * var result = differenceInMilliseconds(
 *   new Date(2014, 6, 2, 12, 30, 21, 700),
 *   new Date(2014, 6, 2, 12, 30, 20, 600)
 * )
 * //=> 1100
 */
function differenceInMilliseconds (dirtyDateLeft, dirtyDateRight, dirtyOptions) {
  if (arguments.length < 2) {
    throw new TypeError('2 arguments required, but only ' + arguments.length + ' present')
  }

  var dateLeft = toDate(dirtyDateLeft, dirtyOptions);
  var dateRight = toDate(dirtyDateRight, dirtyOptions);
  return dateLeft.getTime() - dateRight.getTime()
}

/**
 * @name differenceInSeconds
 * @category Second Helpers
 * @summary Get the number of seconds between the given dates.
 *
 * @description
 * Get the number of seconds between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @param {Options} [options] - the object with options. See [Options]{@link https://date-fns.org/docs/Options}
 * @param {0|1|2} [options.additionalDigits=2] - passed to `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
 * @returns {Number} the number of seconds
 * @throws {TypeError} 2 arguments required
 * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
 *
 * @example
 * // How many seconds are between
 * // 2 July 2014 12:30:07.999 and 2 July 2014 12:30:20.000?
 * var result = differenceInSeconds(
 *   new Date(2014, 6, 2, 12, 30, 20, 0),
 *   new Date(2014, 6, 2, 12, 30, 7, 999)
 * )
 * //=> 12
 */
function differenceInSeconds (dirtyDateLeft, dirtyDateRight, dirtyOptions) {
  if (arguments.length < 2) {
    throw new TypeError('2 arguments required, but only ' + arguments.length + ' present')
  }

  var diff = differenceInMilliseconds(dirtyDateLeft, dirtyDateRight, dirtyOptions) / 1000;
  return diff > 0 ? Math.floor(diff) : Math.ceil(diff)
}

/**
 * @name isValid
 * @category Common Helpers
 * @summary Is the given date valid?
 *
 * @description
 * Returns false if argument is Invalid Date and true otherwise.
 * Argument is converted to Date using `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
 * Invalid Date is a Date, whose time value is NaN.
 *
 * Time value of Date: http://es5.github.io/#x15.9.1.1
 *
 * @param {*} date - the date to check
 * @param {Options} [options] - the object with options. See [Options]{@link https://date-fns.org/docs/Options}
 * @param {0|1|2} [options.additionalDigits=2] - passed to `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
 * @returns {Boolean} the date is valid
 * @throws {TypeError} 1 argument required
 * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
 *
 * @example
 * // For the valid date:
 * var result = isValid(new Date(2014, 1, 31))
 * //=> true
 *
 * @example
 * // For the value, convertable into a date:
 * var result = isValid('2014-02-31')
 * //=> true
 *
 * @example
 * // For the invalid date:
 * var result = isValid(new Date(''))
 * //=> false
 */
function isValid (dirtyDate, dirtyOptions) {
  if (arguments.length < 1) {
    throw new TypeError('1 argument required, but only ' + arguments.length + ' present')
  }

  var date = toDate(dirtyDate, dirtyOptions);
  return !isNaN(date)
}

var formatDistanceLocale = {
  lessThanXSeconds: {
    one: 'less than a second',
    other: 'less than {{count}} seconds'
  },

  xSeconds: {
    one: '1 second',
    other: '{{count}} seconds'
  },

  halfAMinute: 'half a minute',

  lessThanXMinutes: {
    one: 'less than a minute',
    other: 'less than {{count}} minutes'
  },

  xMinutes: {
    one: '1 minute',
    other: '{{count}} minutes'
  },

  aboutXHours: {
    one: 'about 1 hour',
    other: 'about {{count}} hours'
  },

  xHours: {
    one: '1 hour',
    other: '{{count}} hours'
  },

  xDays: {
    one: '1 day',
    other: '{{count}} days'
  },

  aboutXMonths: {
    one: 'about 1 month',
    other: 'about {{count}} months'
  },

  xMonths: {
    one: '1 month',
    other: '{{count}} months'
  },

  aboutXYears: {
    one: 'about 1 year',
    other: 'about {{count}} years'
  },

  xYears: {
    one: '1 year',
    other: '{{count}} years'
  },

  overXYears: {
    one: 'over 1 year',
    other: 'over {{count}} years'
  },

  almostXYears: {
    one: 'almost 1 year',
    other: 'almost {{count}} years'
  }
};

function formatDistance (token, count, options) {
  options = options || {};

  var result;
  if (typeof formatDistanceLocale[token] === 'string') {
    result = formatDistanceLocale[token];
  } else if (count === 1) {
    result = formatDistanceLocale[token].one;
  } else {
    result = formatDistanceLocale[token].other.replace('{{count}}', count);
  }

  if (options.addSuffix) {
    if (options.comparison > 0) {
      return 'in ' + result
    } else {
      return result + ' ago'
    }
  }

  return result
}

var tokensToBeShortedPattern = /MMMM|MM|DD|dddd/g;

function buildShortLongFormat (format) {
  return format.replace(tokensToBeShortedPattern, function (token) {
    return token.slice(1)
  })
}

/**
 * @name buildFormatLongFn
 * @category Locale Helpers
 * @summary Build `formatLong` property for locale used by `format`, `formatRelative` and `parse` functions.
 *
 * @description
 * Build `formatLong` property for locale used by `format`, `formatRelative` and `parse` functions.
 * Returns a function which takes one of the following tokens as the argument:
 * `'LTS'`, `'LT'`, `'L'`, `'LL'`, `'LLL'`, `'l'`, `'ll'`, `'lll'`, `'llll'`
 * and returns a long format string written as `format` token strings.
 * See [format]{@link https://date-fns.org/docs/format}
 *
 * `'l'`, `'ll'`, `'lll'` and `'llll'` formats are built automatically
 * by shortening some of the tokens from corresponding unshortened formats
 * (e.g., if `LL` is `'MMMM DD YYYY'` then `ll` will be `MMM D YYYY`)
 *
 * @param {Object} obj - the object with long formats written as `format` token strings
 * @param {String} obj.LT - time format: hours and minutes
 * @param {String} obj.LTS - time format: hours, minutes and seconds
 * @param {String} obj.L - short date format: numeric day, month and year
 * @param {String} [obj.l] - short date format: numeric day, month and year (shortened)
 * @param {String} obj.LL - long date format: day, month in words, and year
 * @param {String} [obj.ll] - long date format: day, month in words, and year (shortened)
 * @param {String} obj.LLL - long date and time format
 * @param {String} [obj.lll] - long date and time format (shortened)
 * @param {String} obj.LLLL - long date, time and weekday format
 * @param {String} [obj.llll] - long date, time and weekday format (shortened)
 * @returns {Function} `formatLong` property of the locale
 *
 * @example
 * // For `en-US` locale:
 * locale.formatLong = buildFormatLongFn({
 *   LT: 'h:mm aa',
 *   LTS: 'h:mm:ss aa',
 *   L: 'MM/DD/YYYY',
 *   LL: 'MMMM D YYYY',
 *   LLL: 'MMMM D YYYY h:mm aa',
 *   LLLL: 'dddd, MMMM D YYYY h:mm aa'
 * })
 */
function buildFormatLongFn (obj) {
  var formatLongLocale = {
    LTS: obj.LTS,
    LT: obj.LT,
    L: obj.L,
    LL: obj.LL,
    LLL: obj.LLL,
    LLLL: obj.LLLL,
    l: obj.l || buildShortLongFormat(obj.L),
    ll: obj.ll || buildShortLongFormat(obj.LL),
    lll: obj.lll || buildShortLongFormat(obj.LLL),
    llll: obj.llll || buildShortLongFormat(obj.LLLL)
  };

  return function (token) {
    return formatLongLocale[token]
  }
}

var formatLong = buildFormatLongFn({
  LT: 'h:mm aa',
  LTS: 'h:mm:ss aa',
  L: 'MM/DD/YYYY',
  LL: 'MMMM D YYYY',
  LLL: 'MMMM D YYYY h:mm aa',
  LLLL: 'dddd, MMMM D YYYY h:mm aa'
});

var formatRelativeLocale = {
  lastWeek: '[last] dddd [at] LT',
  yesterday: '[yesterday at] LT',
  today: '[today at] LT',
  tomorrow: '[tomorrow at] LT',
  nextWeek: 'dddd [at] LT',
  other: 'L'
};

function formatRelative (token, date, baseDate, options) {
  return formatRelativeLocale[token]
}

/**
 * @name buildLocalizeFn
 * @category Locale Helpers
 * @summary Build `localize.weekday`, `localize.month` and `localize.timeOfDay` properties for the locale.
 *
 * @description
 * Build `localize.weekday`, `localize.month` and `localize.timeOfDay` properties for the locale
 * used by `format` function.
 * If no `type` is supplied to the options of the resulting function, `defaultType` will be used (see example).
 *
 * `localize.weekday` function takes the weekday index as argument (0 - Sunday).
 * `localize.month` takes the month index (0 - January).
 * `localize.timeOfDay` takes the hours. Use `indexCallback` to convert them to an array index (see example).
 *
 * @param {Object} values - the object with arrays of values
 * @param {String} defaultType - the default type for the localize function
 * @param {Function} [indexCallback] - the callback which takes the resulting function argument
 *   and converts it into value array index
 * @returns {Function} the resulting function
 *
 * @example
 * var timeOfDayValues = {
 *   uppercase: ['AM', 'PM'],
 *   lowercase: ['am', 'pm'],
 *   long: ['a.m.', 'p.m.']
 * }
 * locale.localize.timeOfDay = buildLocalizeFn(timeOfDayValues, 'long', function (hours) {
 *   // 0 is a.m. array index, 1 is p.m. array index
 *   return (hours / 12) >= 1 ? 1 : 0
 * })
 * locale.localize.timeOfDay(16, {type: 'uppercase'}) //=> 'PM'
 * locale.localize.timeOfDay(5) //=> 'a.m.'
 */
function buildLocalizeFn (values, defaultType, indexCallback) {
  return function (dirtyIndex, dirtyOptions) {
    var options = dirtyOptions || {};
    var type = options.type ? String(options.type) : defaultType;
    var valuesArray = values[type] || values[defaultType];
    var index = indexCallback ? indexCallback(Number(dirtyIndex)) : Number(dirtyIndex);
    return valuesArray[index]
  }
}

/**
 * @name buildLocalizeArrayFn
 * @category Locale Helpers
 * @summary Build `localize.weekdays`, `localize.months` and `localize.timesOfDay` properties for the locale.
 *
 * @description
 * Build `localize.weekdays`, `localize.months` and `localize.timesOfDay` properties for the locale.
 * If no `type` is supplied to the options of the resulting function, `defaultType` will be used (see example).
 *
 * @param {Object} values - the object with arrays of values
 * @param {String} defaultType - the default type for the localize function
 * @returns {Function} the resulting function
 *
 * @example
 * var weekdayValues = {
 *   narrow: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
 *   short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
 *   long: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
 * }
 * locale.localize.weekdays = buildLocalizeArrayFn(weekdayValues, 'long')
 * locale.localize.weekdays({type: 'narrow'}) //=> ['Su', 'Mo', ...]
 * locale.localize.weekdays() //=> ['Sunday', 'Monday', ...]
 */
function buildLocalizeArrayFn (values, defaultType) {
  return function (dirtyOptions) {
    var options = dirtyOptions || {};
    var type = options.type ? String(options.type) : defaultType;
    return values[type] || values[defaultType]
  }
}

// Note: in English, the names of days of the week and months are capitalized.
// If you are making a new locale based on this one, check if the same is true for the language you're working on.
// Generally, formatted dates should look like they are in the middle of a sentence,
// e.g. in Spanish language the weekdays and months should be in the lowercase.
var weekdayValues = {
  narrow: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  long: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
};

var monthValues = {
  short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  long: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

// `timeOfDay` is used to designate which part of the day it is, when used with 12-hour clock.
// Use the system which is used the most commonly in the locale.
// For example, if the country doesn't use a.m./p.m., you can use `night`/`morning`/`afternoon`/`evening`:
//
//   var timeOfDayValues = {
//     any: ['in the night', 'in the morning', 'in the afternoon', 'in the evening']
//   }
//
// And later:
//
//   var localize = {
//     // The callback takes the hours as the argument and returns the array index
//     timeOfDay: buildLocalizeFn(timeOfDayValues, 'any', function (hours) {
//       if (hours >= 17) {
//         return 3
//       } else if (hours >= 12) {
//         return 2
//       } else if (hours >= 4) {
//         return 1
//       } else {
//         return 0
//       }
//     }),
//     timesOfDay: buildLocalizeArrayFn(timeOfDayValues, 'any')
//   }
var timeOfDayValues = {
  uppercase: ['AM', 'PM'],
  lowercase: ['am', 'pm'],
  long: ['a.m.', 'p.m.']
};

function ordinalNumber (dirtyNumber, dirtyOptions) {
  var number = Number(dirtyNumber);

  // If ordinal numbers depend on context, for example,
  // if they are different for different grammatical genders,
  // use `options.unit`:
  //
  //   var options = dirtyOptions || {}
  //   var unit = String(options.unit)
  //
  // where `unit` can be 'month', 'quarter', 'week', 'isoWeek', 'dayOfYear',
  // 'dayOfMonth' or 'dayOfWeek'

  var rem100 = number % 100;
  if (rem100 > 20 || rem100 < 10) {
    switch (rem100 % 10) {
      case 1:
        return number + 'st'
      case 2:
        return number + 'nd'
      case 3:
        return number + 'rd'
    }
  }
  return number + 'th'
}

var localize = {
  ordinalNumber: ordinalNumber,
  weekday: buildLocalizeFn(weekdayValues, 'long'),
  weekdays: buildLocalizeArrayFn(weekdayValues, 'long'),
  month: buildLocalizeFn(monthValues, 'long'),
  months: buildLocalizeArrayFn(monthValues, 'long'),
  timeOfDay: buildLocalizeFn(timeOfDayValues, 'long', function (hours) {
    return (hours / 12) >= 1 ? 1 : 0
  }),
  timesOfDay: buildLocalizeArrayFn(timeOfDayValues, 'long')
};

/**
 * @name buildMatchFn
 * @category Locale Helpers
 * @summary Build `match.weekdays`, `match.months` and `match.timesOfDay` properties for the locale.
 *
 * @description
 * Build `match.weekdays`, `match.months` and `match.timesOfDay` properties for the locale used by `parse` function.
 * If no `type` is supplied to the options of the resulting function, `defaultType` will be used (see example).
 * The result of the match function will be passed into corresponding parser function
 * (`match.weekday`, `match.month` or `match.timeOfDay` respectively. See `buildParseFn`).
 *
 * @param {Object} values - the object with RegExps
 * @param {String} defaultType - the default type for the match function
 * @returns {Function} the resulting function
 *
 * @example
 * var matchWeekdaysPatterns = {
 *   narrow: /^(su|mo|tu|we|th|fr|sa)/i,
 *   short: /^(sun|mon|tue|wed|thu|fri|sat)/i,
 *   long: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
 * }
 * locale.match.weekdays = buildMatchFn(matchWeekdaysPatterns, 'long')
 * locale.match.weekdays('Sunday', {type: 'narrow'}) //=> ['Su', 'Su', ...]
 * locale.match.weekdays('Sunday') //=> ['Sunday', 'Sunday', ...]
 */
function buildMatchFn (patterns, defaultType) {
  return function (dirtyString, dirtyOptions) {
    var options = dirtyOptions || {};
    var type = options.type ? String(options.type) : defaultType;
    var pattern = patterns[type] || patterns[defaultType];
    var string = String(dirtyString);
    return string.match(pattern)
  }
}

/**
 * @name buildParseFn
 * @category Locale Helpers
 * @summary Build `match.weekday`, `match.month` and `match.timeOfDay` properties for the locale.
 *
 * @description
 * Build `match.weekday`, `match.month` and `match.timeOfDay` properties for the locale used by `parse` function.
 * The argument of the resulting function is the result of the corresponding match function
 * (`match.weekdays`, `match.months` or `match.timesOfDay` respectively. See `buildMatchFn`).
 *
 * @param {Object} values - the object with arrays of RegExps
 * @param {String} defaultType - the default type for the parser function
 * @returns {Function} the resulting function
 *
 * @example
 * var parseWeekdayPatterns = {
 *   any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
 * }
 * locale.match.weekday = buildParseFn(matchWeekdaysPatterns, 'long')
 * var matchResult = locale.match.weekdays('Friday')
 * locale.match.weekday(matchResult) //=> 5
 */
function buildParseFn (patterns, defaultType) {
  return function (matchResult, dirtyOptions) {
    var options = dirtyOptions || {};
    var type = options.type ? String(options.type) : defaultType;
    var patternsArray = patterns[type] || patterns[defaultType];
    var string = matchResult[1];

    return patternsArray.findIndex(function (pattern) {
      return pattern.test(string)
    })
  }
}

/**
 * @name buildMatchPatternFn
 * @category Locale Helpers
 * @summary Build match function from a single RegExp.
 *
 * @description
 * Build match function from a single RegExp.
 * Usually used for building `match.ordinalNumbers` property of the locale.
 *
 * @param {Object} pattern - the RegExp
 * @returns {Function} the resulting function
 *
 * @example
 * locale.match.ordinalNumbers = buildMatchPatternFn(/^(\d+)(th|st|nd|rd)?/i)
 * locale.match.ordinalNumbers('3rd') //=> ['3rd', '3', 'rd', ...]
 */
function buildMatchPatternFn (pattern) {
  return function (dirtyString) {
    var string = String(dirtyString);
    return string.match(pattern)
  }
}

/**
 * @name parseDecimal
 * @category Locale Helpers
 * @summary Parses the match result into decimal number.
 *
 * @description
 * Parses the match result into decimal number.
 * Uses the string matched with the first set of parentheses of match RegExp.
 *
 * @param {Array} matchResult - the object returned by matching function
 * @returns {Number} the parsed value
 *
 * @example
 * locale.match = {
 *   ordinalNumbers: (dirtyString) {
 *     return String(dirtyString).match(/^(\d+)(th|st|nd|rd)?/i)
 *   },
 *   ordinalNumber: parseDecimal
 * }
 */
function parseDecimal (matchResult) {
  return parseInt(matchResult[1], 10)
}

var matchOrdinalNumbersPattern = /^(\d+)(th|st|nd|rd)?/i;

var matchWeekdaysPatterns = {
  narrow: /^(su|mo|tu|we|th|fr|sa)/i,
  short: /^(sun|mon|tue|wed|thu|fri|sat)/i,
  long: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
};

var parseWeekdayPatterns = {
  any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
};

var matchMonthsPatterns = {
  short: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  long: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
};

var parseMonthPatterns = {
  any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
};

// `timeOfDay` is used to designate which part of the day it is, when used with 12-hour clock.
// Use the system which is used the most commonly in the locale.
// For example, if the country doesn't use a.m./p.m., you can use `night`/`morning`/`afternoon`/`evening`:
//
//   var matchTimesOfDayPatterns = {
//     long: /^((in the)? (night|morning|afternoon|evening?))/i
//   }
//
//   var parseTimeOfDayPatterns = {
//     any: [/(night|morning)/i, /(afternoon|evening)/i]
//   }
var matchTimesOfDayPatterns = {
  short: /^(am|pm)/i,
  long: /^([ap]\.?\s?m\.?)/i
};

var parseTimeOfDayPatterns = {
  any: [/^a/i, /^p/i]
};

var match = {
  ordinalNumbers: buildMatchPatternFn(matchOrdinalNumbersPattern),
  ordinalNumber: parseDecimal,
  weekdays: buildMatchFn(matchWeekdaysPatterns, 'long'),
  weekday: buildParseFn(parseWeekdayPatterns, 'any'),
  months: buildMatchFn(matchMonthsPatterns, 'long'),
  month: buildParseFn(parseMonthPatterns, 'any'),
  timesOfDay: buildMatchFn(matchTimesOfDayPatterns, 'long'),
  timeOfDay: buildParseFn(parseTimeOfDayPatterns, 'any')
};

/**
 * @type {Locale}
 * @category Locales
 * @summary English locale (United States).
 * @language English
 * @iso-639-2 eng
 */
var locale = {
  formatDistance: formatDistance,
  formatLong: formatLong,
  formatRelative: formatRelative,
  localize: localize,
  match: match,
  options: {
    weekStartsOn: 0 /* Sunday */,
    firstWeekContainsDate: 1
  }
};

var MILLISECONDS_IN_DAY$1 = 86400000;

// This function will be a part of public API when UTC function will be implemented.
// See issue: https://github.com/date-fns/date-fns/issues/376
function getUTCDayOfYear (dirtyDate, dirtyOptions) {
  var date = toDate(dirtyDate, dirtyOptions);
  var timestamp = date.getTime();
  date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
  var startOfYearTimestamp = date.getTime();
  var difference = timestamp - startOfYearTimestamp;
  return Math.floor(difference / MILLISECONDS_IN_DAY$1) + 1
}

// This function will be a part of public API when UTC function will be implemented.
// See issue: https://github.com/date-fns/date-fns/issues/376
function startOfUTCISOWeek (dirtyDate, dirtyOptions) {
  var weekStartsOn = 1;

  var date = toDate(dirtyDate, dirtyOptions);
  var day = date.getUTCDay();
  var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;

  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date
}

// This function will be a part of public API when UTC function will be implemented.
// See issue: https://github.com/date-fns/date-fns/issues/376
function getUTCISOWeekYear (dirtyDate, dirtyOptions) {
  var date = toDate(dirtyDate, dirtyOptions);
  var year = date.getUTCFullYear();

  var fourthOfJanuaryOfNextYear = new Date(0);
  fourthOfJanuaryOfNextYear.setUTCFullYear(year + 1, 0, 4);
  fourthOfJanuaryOfNextYear.setUTCHours(0, 0, 0, 0);
  var startOfNextYear = startOfUTCISOWeek(fourthOfJanuaryOfNextYear, dirtyOptions);

  var fourthOfJanuaryOfThisYear = new Date(0);
  fourthOfJanuaryOfThisYear.setUTCFullYear(year, 0, 4);
  fourthOfJanuaryOfThisYear.setUTCHours(0, 0, 0, 0);
  var startOfThisYear = startOfUTCISOWeek(fourthOfJanuaryOfThisYear, dirtyOptions);

  if (date.getTime() >= startOfNextYear.getTime()) {
    return year + 1
  } else if (date.getTime() >= startOfThisYear.getTime()) {
    return year
  } else {
    return year - 1
  }
}

// This function will be a part of public API when UTC function will be implemented.
// See issue: https://github.com/date-fns/date-fns/issues/376
function startOfUTCISOWeekYear (dirtyDate, dirtyOptions) {
  var year = getUTCISOWeekYear(dirtyDate, dirtyOptions);
  var fourthOfJanuary = new Date(0);
  fourthOfJanuary.setUTCFullYear(year, 0, 4);
  fourthOfJanuary.setUTCHours(0, 0, 0, 0);
  var date = startOfUTCISOWeek(fourthOfJanuary, dirtyOptions);
  return date
}

var MILLISECONDS_IN_WEEK$2 = 604800000;

// This function will be a part of public API when UTC function will be implemented.
// See issue: https://github.com/date-fns/date-fns/issues/376
function getUTCISOWeek (dirtyDate, dirtyOptions) {
  var date = toDate(dirtyDate, dirtyOptions);
  var diff = startOfUTCISOWeek(date, dirtyOptions).getTime() - startOfUTCISOWeekYear(date, dirtyOptions).getTime();

  // Round the number of days to the nearest integer
  // because the number of milliseconds in a week is not constant
  // (e.g. it's different in the week of the daylight saving time clock shift)
  return Math.round(diff / MILLISECONDS_IN_WEEK$2) + 1
}

var formatters = {
  // Month: 1, 2, ..., 12
  'M': function (date) {
    return date.getUTCMonth() + 1
  },

  // Month: 1st, 2nd, ..., 12th
  'Mo': function (date, options) {
    var month = date.getUTCMonth() + 1;
    return options.locale.localize.ordinalNumber(month, {unit: 'month'})
  },

  // Month: 01, 02, ..., 12
  'MM': function (date) {
    return addLeadingZeros(date.getUTCMonth() + 1, 2)
  },

  // Month: Jan, Feb, ..., Dec
  'MMM': function (date, options) {
    return options.locale.localize.month(date.getUTCMonth(), {type: 'short'})
  },

  // Month: January, February, ..., December
  'MMMM': function (date, options) {
    return options.locale.localize.month(date.getUTCMonth(), {type: 'long'})
  },

  // Quarter: 1, 2, 3, 4
  'Q': function (date) {
    return Math.ceil((date.getUTCMonth() + 1) / 3)
  },

  // Quarter: 1st, 2nd, 3rd, 4th
  'Qo': function (date, options) {
    var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);
    return options.locale.localize.ordinalNumber(quarter, {unit: 'quarter'})
  },

  // Day of month: 1, 2, ..., 31
  'D': function (date) {
    return date.getUTCDate()
  },

  // Day of month: 1st, 2nd, ..., 31st
  'Do': function (date, options) {
    return options.locale.localize.ordinalNumber(date.getUTCDate(), {unit: 'dayOfMonth'})
  },

  // Day of month: 01, 02, ..., 31
  'DD': function (date) {
    return addLeadingZeros(date.getUTCDate(), 2)
  },

  // Day of year: 1, 2, ..., 366
  'DDD': function (date) {
    return getUTCDayOfYear(date)
  },

  // Day of year: 1st, 2nd, ..., 366th
  'DDDo': function (date, options) {
    return options.locale.localize.ordinalNumber(getUTCDayOfYear(date), {unit: 'dayOfYear'})
  },

  // Day of year: 001, 002, ..., 366
  'DDDD': function (date) {
    return addLeadingZeros(getUTCDayOfYear(date), 3)
  },

  // Day of week: Su, Mo, ..., Sa
  'dd': function (date, options) {
    return options.locale.localize.weekday(date.getUTCDay(), {type: 'narrow'})
  },

  // Day of week: Sun, Mon, ..., Sat
  'ddd': function (date, options) {
    return options.locale.localize.weekday(date.getUTCDay(), {type: 'short'})
  },

  // Day of week: Sunday, Monday, ..., Saturday
  'dddd': function (date, options) {
    return options.locale.localize.weekday(date.getUTCDay(), {type: 'long'})
  },

  // Day of week: 0, 1, ..., 6
  'd': function (date) {
    return date.getUTCDay()
  },

  // Day of week: 0th, 1st, 2nd, ..., 6th
  'do': function (date, options) {
    return options.locale.localize.ordinalNumber(date.getUTCDay(), {unit: 'dayOfWeek'})
  },

  // Day of ISO week: 1, 2, ..., 7
  'E': function (date) {
    return date.getUTCDay() || 7
  },

  // ISO week: 1, 2, ..., 53
  'W': function (date) {
    return getUTCISOWeek(date)
  },

  // ISO week: 1st, 2nd, ..., 53th
  'Wo': function (date, options) {
    return options.locale.localize.ordinalNumber(getUTCISOWeek(date), {unit: 'isoWeek'})
  },

  // ISO week: 01, 02, ..., 53
  'WW': function (date) {
    return addLeadingZeros(getUTCISOWeek(date), 2)
  },

  // Year: 00, 01, ..., 99
  'YY': function (date) {
    return addLeadingZeros(date.getUTCFullYear(), 4).substr(2)
  },

  // Year: 1900, 1901, ..., 2099
  'YYYY': function (date) {
    return addLeadingZeros(date.getUTCFullYear(), 4)
  },

  // ISO week-numbering year: 00, 01, ..., 99
  'GG': function (date) {
    return String(getUTCISOWeekYear(date)).substr(2)
  },

  // ISO week-numbering year: 1900, 1901, ..., 2099
  'GGGG': function (date) {
    return getUTCISOWeekYear(date)
  },

  // Hour: 0, 1, ... 23
  'H': function (date) {
    return date.getUTCHours()
  },

  // Hour: 00, 01, ..., 23
  'HH': function (date) {
    return addLeadingZeros(date.getUTCHours(), 2)
  },

  // Hour: 1, 2, ..., 12
  'h': function (date) {
    var hours = date.getUTCHours();
    if (hours === 0) {
      return 12
    } else if (hours > 12) {
      return hours % 12
    } else {
      return hours
    }
  },

  // Hour: 01, 02, ..., 12
  'hh': function (date) {
    return addLeadingZeros(formatters['h'](date), 2)
  },

  // Minute: 0, 1, ..., 59
  'm': function (date) {
    return date.getUTCMinutes()
  },

  // Minute: 00, 01, ..., 59
  'mm': function (date) {
    return addLeadingZeros(date.getUTCMinutes(), 2)
  },

  // Second: 0, 1, ..., 59
  's': function (date) {
    return date.getUTCSeconds()
  },

  // Second: 00, 01, ..., 59
  'ss': function (date) {
    return addLeadingZeros(date.getUTCSeconds(), 2)
  },

  // 1/10 of second: 0, 1, ..., 9
  'S': function (date) {
    return Math.floor(date.getUTCMilliseconds() / 100)
  },

  // 1/100 of second: 00, 01, ..., 99
  'SS': function (date) {
    return addLeadingZeros(Math.floor(date.getUTCMilliseconds() / 10), 2)
  },

  // Millisecond: 000, 001, ..., 999
  'SSS': function (date) {
    return addLeadingZeros(date.getUTCMilliseconds(), 3)
  },

  // Timezone: -01:00, +00:00, ... +12:00
  'Z': function (date, options) {
    var originalDate = options._originalDate || date;
    return formatTimezone(originalDate.getTimezoneOffset(), ':')
  },

  // Timezone: -0100, +0000, ... +1200
  'ZZ': function (date, options) {
    var originalDate = options._originalDate || date;
    return formatTimezone(originalDate.getTimezoneOffset())
  },

  // Seconds timestamp: 512969520
  'X': function (date, options) {
    var originalDate = options._originalDate || date;
    return Math.floor(originalDate.getTime() / 1000)
  },

  // Milliseconds timestamp: 512969520900
  'x': function (date, options) {
    var originalDate = options._originalDate || date;
    return originalDate.getTime()
  },

  // AM, PM
  'A': function (date, options) {
    return options.locale.localize.timeOfDay(date.getUTCHours(), {type: 'uppercase'})
  },

  // am, pm
  'a': function (date, options) {
    return options.locale.localize.timeOfDay(date.getUTCHours(), {type: 'lowercase'})
  },

  // a.m., p.m.
  'aa': function (date, options) {
    return options.locale.localize.timeOfDay(date.getUTCHours(), {type: 'long'})
  }
};

function formatTimezone (offset, delimeter) {
  delimeter = delimeter || '';
  var sign = offset > 0 ? '-' : '+';
  var absOffset = Math.abs(offset);
  var hours = Math.floor(absOffset / 60);
  var minutes = absOffset % 60;
  return sign + addLeadingZeros(hours, 2) + delimeter + addLeadingZeros(minutes, 2)
}

function addLeadingZeros (number, targetLength) {
  var output = Math.abs(number).toString();
  while (output.length < targetLength) {
    output = '0' + output;
  }
  return output
}

// This function will be a part of public API when UTC function will be implemented.
// See issue: https://github.com/date-fns/date-fns/issues/376
function addUTCMinutes (dirtyDate, dirtyAmount, dirtyOptions) {
  var date = toDate(dirtyDate, dirtyOptions);
  var amount = Number(dirtyAmount);
  date.setUTCMinutes(date.getUTCMinutes() + amount);
  return date
}

var longFormattingTokensRegExp = /(\[[^[]*])|(\\)?(LTS|LT|LLLL|LLL|LL|L|llll|lll|ll|l)/g;
var defaultFormattingTokensRegExp = /(\[[^[]*])|(\\)?(x|ss|s|mm|m|hh|h|do|dddd|ddd|dd|d|aa|a|ZZ|Z|YYYY|YY|X|Wo|WW|W|SSS|SS|S|Qo|Q|Mo|MMMM|MMM|MM|M|HH|H|GGGG|GG|E|Do|DDDo|DDDD|DDD|DD|D|A|.)/g;

/**
 * @name format
 * @category Common Helpers
 * @summary Format the date.
 *
 * @description
 * Return the formatted date string in the given format.
 *
 * Accepted tokens:
 * | Unit                    | Token | Result examples                  |
 * |-------------------------|-------|----------------------------------|
 * | Month                   | M     | 1, 2, ..., 12                    |
 * |                         | Mo    | 1st, 2nd, ..., 12th              |
 * |                         | MM    | 01, 02, ..., 12                  |
 * |                         | MMM   | Jan, Feb, ..., Dec               |
 * |                         | MMMM  | January, February, ..., December |
 * | Quarter                 | Q     | 1, 2, 3, 4                       |
 * |                         | Qo    | 1st, 2nd, 3rd, 4th               |
 * | Day of month            | D     | 1, 2, ..., 31                    |
 * |                         | Do    | 1st, 2nd, ..., 31st              |
 * |                         | DD    | 01, 02, ..., 31                  |
 * | Day of year             | DDD   | 1, 2, ..., 366                   |
 * |                         | DDDo  | 1st, 2nd, ..., 366th             |
 * |                         | DDDD  | 001, 002, ..., 366               |
 * | Day of week             | d     | 0, 1, ..., 6                     |
 * |                         | do    | 0th, 1st, ..., 6th               |
 * |                         | dd    | Su, Mo, ..., Sa                  |
 * |                         | ddd   | Sun, Mon, ..., Sat               |
 * |                         | dddd  | Sunday, Monday, ..., Saturday    |
 * | Day of ISO week         | E     | 1, 2, ..., 7                     |
 * | ISO week                | W     | 1, 2, ..., 53                    |
 * |                         | Wo    | 1st, 2nd, ..., 53rd              |
 * |                         | WW    | 01, 02, ..., 53                  |
 * | Year                    | YY    | 00, 01, ..., 99                  |
 * |                         | YYYY  | 1900, 1901, ..., 2099            |
 * | ISO week-numbering year | GG    | 00, 01, ..., 99                  |
 * |                         | GGGG  | 1900, 1901, ..., 2099            |
 * | AM/PM                   | A     | AM, PM                           |
 * |                         | a     | am, pm                           |
 * |                         | aa    | a.m., p.m.                       |
 * | Hour                    | H     | 0, 1, ... 23                     |
 * |                         | HH    | 00, 01, ... 23                   |
 * |                         | h     | 1, 2, ..., 12                    |
 * |                         | hh    | 01, 02, ..., 12                  |
 * | Minute                  | m     | 0, 1, ..., 59                    |
 * |                         | mm    | 00, 01, ..., 59                  |
 * | Second                  | s     | 0, 1, ..., 59                    |
 * |                         | ss    | 00, 01, ..., 59                  |
 * | 1/10 of second          | S     | 0, 1, ..., 9                     |
 * | 1/100 of second         | SS    | 00, 01, ..., 99                  |
 * | Millisecond             | SSS   | 000, 001, ..., 999               |
 * | Timezone                | Z     | -01:00, +00:00, ... +12:00       |
 * |                         | ZZ    | -0100, +0000, ..., +1200         |
 * | Seconds timestamp       | X     | 512969520                        |
 * | Milliseconds timestamp  | x     | 512969520900                     |
 * | Long format             | LT    | 05:30 a.m.                       |
 * |                         | LTS   | 05:30:15 a.m.                    |
 * |                         | L     | 07/02/1995                       |
 * |                         | l     | 7/2/1995                         |
 * |                         | LL    | July 2 1995                      |
 * |                         | ll    | Jul 2 1995                       |
 * |                         | LLL   | July 2 1995 05:30 a.m.           |
 * |                         | lll   | Jul 2 1995 05:30 a.m.            |
 * |                         | LLLL  | Sunday, July 2 1995 05:30 a.m.   |
 * |                         | llll  | Sun, Jul 2 1995 05:30 a.m.       |
 *
 * The characters wrapped in square brackets are escaped.
 *
 * The result may vary by locale.
 *
 * @param {Date|String|Number} date - the original date
 * @param {String} format - the string of tokens
 * @param {Options} [options] - the object with options. See [Options]{@link https://date-fns.org/docs/Options}
 * @param {0|1|2} [options.additionalDigits=2] - passed to `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
 * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
 * @returns {String} the formatted date string
 * @throws {TypeError} 2 arguments required
 * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
 * @throws {RangeError} `options.locale` must contain `localize` property
 * @throws {RangeError} `options.locale` must contain `formatLong` property
 *
 * @example
 * // Represent 11 February 2014 in middle-endian format:
 * var result = format(
 *   new Date(2014, 1, 11),
 *   'MM/DD/YYYY'
 * )
 * //=> '02/11/2014'
 *
 * @example
 * // Represent 2 July 2014 in Esperanto:
 * import { eoLocale } from 'date-fns/locale/eo'
 * var result = format(
 *   new Date(2014, 6, 2),
 *   'Do [de] MMMM YYYY',
 *   {locale: eoLocale}
 * )
 * //=> '2-a de julio 2014'
 */
function format (dirtyDate, dirtyFormatStr, dirtyOptions) {
  if (arguments.length < 2) {
    throw new TypeError('2 arguments required, but only ' + arguments.length + ' present')
  }

  var formatStr = String(dirtyFormatStr);
  var options = dirtyOptions || {};

  var locale$$1 = options.locale || locale;

  if (!locale$$1.localize) {
    throw new RangeError('locale must contain localize property')
  }

  if (!locale$$1.formatLong) {
    throw new RangeError('locale must contain formatLong property')
  }

  var localeFormatters = locale$$1.formatters || {};
  var formattingTokensRegExp = locale$$1.formattingTokensRegExp || defaultFormattingTokensRegExp;
  var formatLong = locale$$1.formatLong;

  var originalDate = toDate(dirtyDate, options);

  if (!isValid(originalDate, options)) {
    return 'Invalid Date'
  }

  // Convert the date in system timezone to the same date in UTC+00:00 timezone.
  // This ensures that when UTC functions will be implemented, locales will be compatible with them.
  // See an issue about UTC functions: https://github.com/date-fns/date-fns/issues/376
  var timezoneOffset = originalDate.getTimezoneOffset();
  var utcDate = addUTCMinutes(originalDate, -timezoneOffset, options);

  var formatterOptions = cloneObject(options);
  formatterOptions.locale = locale$$1;
  formatterOptions.formatters = formatters;

  // When UTC functions will be implemented, options._originalDate will likely be a part of public API.
  // Right now, please don't use it in locales. If you have to use an original date,
  // please restore it from `date`, adding a timezone offset to it.
  formatterOptions._originalDate = originalDate;

  var result = formatStr
    .replace(longFormattingTokensRegExp, function (substring) {
      if (substring[0] === '[') {
        return substring
      }

      if (substring[0] === '\\') {
        return cleanEscapedString(substring)
      }

      return formatLong(substring)
    })
    .replace(formattingTokensRegExp, function (substring) {
      var formatter = localeFormatters[substring] || formatters[substring];

      if (formatter) {
        return formatter(utcDate, formatterOptions)
      } else {
        return cleanEscapedString(substring)
      }
    });

  return result
}

function cleanEscapedString (input) {
  if (input.match(/\[[\s\S]/)) {
    return input.replace(/^\[|]$/g, '')
  }
  return input.replace(/\\/g, '')
}

/**
 * @name isEqual
 * @category Common Helpers
 * @summary Are the given dates equal?
 *
 * @description
 * Are the given dates equal?
 *
 * @param {Date|String|Number} dateLeft - the first date to compare
 * @param {Date|String|Number} dateRight - the second date to compare
 * @param {Options} [options] - the object with options. See [Options]{@link https://date-fns.org/docs/Options}
 * @param {0|1|2} [options.additionalDigits=2] - passed to `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
 * @returns {Boolean} the dates are equal
 * @throws {TypeError} 2 arguments required
 * @throws {RangeError} `options.additionalDigits` must be 0, 1 or 2
 *
 * @example
 * // Are 2 July 2014 06:30:45.000 and 2 July 2014 06:30:45.500 equal?
 * var result = isEqual(
 *   new Date(2014, 6, 2, 6, 30, 45, 0)
 *   new Date(2014, 6, 2, 6, 30, 45, 500)
 * )
 * //=> false
 */
function isEqual (dirtyLeftDate, dirtyRightDate, dirtyOptions) {
  if (arguments.length < 2) {
    throw new TypeError('2 arguments required, but only ' + arguments.length + ' present')
  }

  var dateLeft = toDate(dirtyLeftDate, dirtyOptions);
  var dateRight = toDate(dirtyRightDate, dirtyOptions);
  return dateLeft.getTime() === dateRight.getTime()
}

// This file is generated automatically by `scripts/build/indices.js`. Please, don't change it.

var MINUTE_IN_SECONDS = 60;
var HOUR_IN_SECONDS = MINUTE_IN_SECONDS * 60;
var DAY_IN_SECONDS = HOUR_IN_SECONDS * 24;

var difference = function difference(date1, date2) {
  var totalInSeconds = differenceInSeconds(date1, date2);

  var seconds = totalInSeconds;

  var days = Math.floor(seconds / DAY_IN_SECONDS);
  seconds = seconds % DAY_IN_SECONDS;

  var hours = Math.floor(seconds / HOUR_IN_SECONDS);
  seconds = seconds % HOUR_IN_SECONDS;

  var minutes = Math.floor(seconds / MINUTE_IN_SECONDS);
  seconds = seconds % MINUTE_IN_SECONDS;

  return { days: days, hours: hours, minutes: minutes, seconds: seconds, totalInSeconds: totalInSeconds };
};

var formatHtmlDatetime = function formatHtmlDatetime(date) {
  return format(date, 'YYYY-MM-DDTHH:mm:ss.SSSZ');
};

var formatIntegerRange = function formatIntegerRange() {
  var count = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : -1;
  var min = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var max = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 99;
  var maxSuffix = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '';

  count = parseInt(count, 10);
  if (count <= min) {
    return '' + parseInt(min, 10);
  }
  if (count > max) {
    return '' + parseInt(max, 10) + maxSuffix;
  }
  return count.toString();
};

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

function makeEmptyFunction(arg) {
  return function () {
    return arg;
  };
}

/**
 * This function accepts and discards inputs; it has no side effects. This is
 * primarily useful idiomatically for overridable function endpoints which
 * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
 */
var emptyFunction = function emptyFunction() {};

emptyFunction.thatReturns = makeEmptyFunction;
emptyFunction.thatReturnsFalse = makeEmptyFunction(false);
emptyFunction.thatReturnsTrue = makeEmptyFunction(true);
emptyFunction.thatReturnsNull = makeEmptyFunction(null);
emptyFunction.thatReturnsThis = function () {
  return this;
};
emptyFunction.thatReturnsArgument = function (arg) {
  return arg;
};

var emptyFunction_1 = emptyFunction;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var validateFormat = function validateFormat(format) {};

if (process.env.NODE_ENV !== 'production') {
  validateFormat = function validateFormat(format) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  };
}

function invariant(condition, format, a, b, c, d, e, f) {
  validateFormat(format);

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error('Minified exception occurred; use the non-minified dev environment ' + 'for the full error message and additional helpful warnings.');
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(format.replace(/%s/g, function () {
        return args[argIndex++];
      }));
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
}

var invariant_1 = invariant;

/**
 * Similar to invariant but only logs a warning if the condition is not met.
 * This can be used to log issues in development environments in critical
 * paths. Removing the logging code for production environments will keep the
 * same logic and follow the same code paths.
 */

var warning = emptyFunction_1;

if (process.env.NODE_ENV !== 'production') {
  var printWarning = function printWarning(format) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    var argIndex = 0;
    var message = 'Warning: ' + format.replace(/%s/g, function () {
      return args[argIndex++];
    });
    if (typeof console !== 'undefined') {
      console.error(message);
    }
    try {
      // --- Welcome to debugging React ---
      // This error was thrown as a convenience so that you can use this stack
      // to find the callsite that caused this warning to fire.
      throw new Error(message);
    } catch (x) {}
  };

  warning = function warning(condition, format) {
    if (format === undefined) {
      throw new Error('`warning(condition, format, ...args)` requires a warning ' + 'message argument');
    }

    if (format.indexOf('Failed Composite propType: ') === 0) {
      return; // Ignore CompositeComponent proptype check.
    }

    if (!condition) {
      for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
        args[_key2 - 2] = arguments[_key2];
      }

      printWarning.apply(undefined, [format].concat(args));
    }
  };
}

var warning_1 = warning;

/*
object-assign
(c) Sindre Sorhus
@license MIT
*/

/* eslint-disable no-unused-vars */
var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (err) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (getOwnPropertySymbols) {
			symbols = getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var ReactPropTypesSecret = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';

var ReactPropTypesSecret_1 = ReactPropTypesSecret;

if (process.env.NODE_ENV !== 'production') {
  var invariant$1 = invariant_1;
  var warning$1 = warning_1;
  var ReactPropTypesSecret$1 = ReactPropTypesSecret_1;
  var loggedTypeFailures = {};
}

/**
 * Assert that the values match with the type specs.
 * Error messages are memorized and will only be shown once.
 *
 * @param {object} typeSpecs Map of name to a ReactPropType
 * @param {object} values Runtime values that need to be type-checked
 * @param {string} location e.g. "prop", "context", "child context"
 * @param {string} componentName Name of the component for error messages.
 * @param {?Function} getStack Returns the component stack.
 * @private
 */
function checkPropTypes(typeSpecs, values, location, componentName, getStack) {
  if (process.env.NODE_ENV !== 'production') {
    for (var typeSpecName in typeSpecs) {
      if (typeSpecs.hasOwnProperty(typeSpecName)) {
        var error;
        // Prop type validation may throw. In case they do, we don't want to
        // fail the render phase where it didn't fail before. So we log it.
        // After these have been cleaned up, we'll let them throw.
        try {
          // This is intentionally an invariant that gets caught. It's the same
          // behavior as without this statement except with a better message.
          invariant$1(typeof typeSpecs[typeSpecName] === 'function', '%s: %s type `%s` is invalid; it must be a function, usually from ' + 'the `prop-types` package, but received `%s`.', componentName || 'React class', location, typeSpecName, typeof typeSpecs[typeSpecName]);
          error = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, ReactPropTypesSecret$1);
        } catch (ex) {
          error = ex;
        }
        warning$1(!error || error instanceof Error, '%s: type specification of %s `%s` is invalid; the type checker ' + 'function must return `null` or an `Error` but returned a %s. ' + 'You may have forgotten to pass an argument to the type checker ' + 'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' + 'shape all require an argument).', componentName || 'React class', location, typeSpecName, typeof error);
        if (error instanceof Error && !(error.message in loggedTypeFailures)) {
          // Only monitor this failure once because there tends to be a lot of the
          // same error.
          loggedTypeFailures[error.message] = true;

          var stack = getStack ? getStack() : '';

          warning$1(false, 'Failed %s type: %s%s', location, error.message, stack != null ? stack : '');
        }
      }
    }
  }
}

var checkPropTypes_1 = checkPropTypes;

var factoryWithTypeCheckers = function(isValidElement, throwOnDirectAccess) {
  /* global Symbol */
  var ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
  var FAUX_ITERATOR_SYMBOL = '@@iterator'; // Before Symbol spec.

  /**
   * Returns the iterator method function contained on the iterable object.
   *
   * Be sure to invoke the function with the iterable as context:
   *
   *     var iteratorFn = getIteratorFn(myIterable);
   *     if (iteratorFn) {
   *       var iterator = iteratorFn.call(myIterable);
   *       ...
   *     }
   *
   * @param {?object} maybeIterable
   * @return {?function}
   */
  function getIteratorFn(maybeIterable) {
    var iteratorFn = maybeIterable && (ITERATOR_SYMBOL && maybeIterable[ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL]);
    if (typeof iteratorFn === 'function') {
      return iteratorFn;
    }
  }

  /**
   * Collection of methods that allow declaration and validation of props that are
   * supplied to React components. Example usage:
   *
   *   var Props = require('ReactPropTypes');
   *   var MyArticle = React.createClass({
   *     propTypes: {
   *       // An optional string prop named "description".
   *       description: Props.string,
   *
   *       // A required enum prop named "category".
   *       category: Props.oneOf(['News','Photos']).isRequired,
   *
   *       // A prop named "dialog" that requires an instance of Dialog.
   *       dialog: Props.instanceOf(Dialog).isRequired
   *     },
   *     render: function() { ... }
   *   });
   *
   * A more formal specification of how these methods are used:
   *
   *   type := array|bool|func|object|number|string|oneOf([...])|instanceOf(...)
   *   decl := ReactPropTypes.{type}(.isRequired)?
   *
   * Each and every declaration produces a function with the same signature. This
   * allows the creation of custom validation functions. For example:
   *
   *  var MyLink = React.createClass({
   *    propTypes: {
   *      // An optional string or URI prop named "href".
   *      href: function(props, propName, componentName) {
   *        var propValue = props[propName];
   *        if (propValue != null && typeof propValue !== 'string' &&
   *            !(propValue instanceof URI)) {
   *          return new Error(
   *            'Expected a string or an URI for ' + propName + ' in ' +
   *            componentName
   *          );
   *        }
   *      }
   *    },
   *    render: function() {...}
   *  });
   *
   * @internal
   */

  var ANONYMOUS = '<<anonymous>>';

  // Important!
  // Keep this list in sync with production version in `./factoryWithThrowingShims.js`.
  var ReactPropTypes = {
    array: createPrimitiveTypeChecker('array'),
    bool: createPrimitiveTypeChecker('boolean'),
    func: createPrimitiveTypeChecker('function'),
    number: createPrimitiveTypeChecker('number'),
    object: createPrimitiveTypeChecker('object'),
    string: createPrimitiveTypeChecker('string'),
    symbol: createPrimitiveTypeChecker('symbol'),

    any: createAnyTypeChecker(),
    arrayOf: createArrayOfTypeChecker,
    element: createElementTypeChecker(),
    instanceOf: createInstanceTypeChecker,
    node: createNodeChecker(),
    objectOf: createObjectOfTypeChecker,
    oneOf: createEnumTypeChecker,
    oneOfType: createUnionTypeChecker,
    shape: createShapeTypeChecker,
    exact: createStrictShapeTypeChecker,
  };

  /**
   * inlined Object.is polyfill to avoid requiring consumers ship their own
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
   */
  /*eslint-disable no-self-compare*/
  function is(x, y) {
    // SameValue algorithm
    if (x === y) {
      // Steps 1-5, 7-10
      // Steps 6.b-6.e: +0 != -0
      return x !== 0 || 1 / x === 1 / y;
    } else {
      // Step 6.a: NaN == NaN
      return x !== x && y !== y;
    }
  }
  /*eslint-enable no-self-compare*/

  /**
   * We use an Error-like object for backward compatibility as people may call
   * PropTypes directly and inspect their output. However, we don't use real
   * Errors anymore. We don't inspect their stack anyway, and creating them
   * is prohibitively expensive if they are created too often, such as what
   * happens in oneOfType() for any type before the one that matched.
   */
  function PropTypeError(message) {
    this.message = message;
    this.stack = '';
  }
  // Make `instanceof Error` still work for returned errors.
  PropTypeError.prototype = Error.prototype;

  function createChainableTypeChecker(validate) {
    if (process.env.NODE_ENV !== 'production') {
      var manualPropTypeCallCache = {};
      var manualPropTypeWarningCount = 0;
    }
    function checkType(isRequired, props, propName, componentName, location, propFullName, secret) {
      componentName = componentName || ANONYMOUS;
      propFullName = propFullName || propName;

      if (secret !== ReactPropTypesSecret_1) {
        if (throwOnDirectAccess) {
          // New behavior only for users of `prop-types` package
          invariant_1(
            false,
            'Calling PropTypes validators directly is not supported by the `prop-types` package. ' +
            'Use `PropTypes.checkPropTypes()` to call them. ' +
            'Read more at http://fb.me/use-check-prop-types'
          );
        } else if (process.env.NODE_ENV !== 'production' && typeof console !== 'undefined') {
          // Old behavior for people using React.PropTypes
          var cacheKey = componentName + ':' + propName;
          if (
            !manualPropTypeCallCache[cacheKey] &&
            // Avoid spamming the console because they are often not actionable except for lib authors
            manualPropTypeWarningCount < 3
          ) {
            warning_1(
              false,
              'You are manually calling a React.PropTypes validation ' +
              'function for the `%s` prop on `%s`. This is deprecated ' +
              'and will throw in the standalone `prop-types` package. ' +
              'You may be seeing this warning due to a third-party PropTypes ' +
              'library. See https://fb.me/react-warning-dont-call-proptypes ' + 'for details.',
              propFullName,
              componentName
            );
            manualPropTypeCallCache[cacheKey] = true;
            manualPropTypeWarningCount++;
          }
        }
      }
      if (props[propName] == null) {
        if (isRequired) {
          if (props[propName] === null) {
            return new PropTypeError('The ' + location + ' `' + propFullName + '` is marked as required ' + ('in `' + componentName + '`, but its value is `null`.'));
          }
          return new PropTypeError('The ' + location + ' `' + propFullName + '` is marked as required in ' + ('`' + componentName + '`, but its value is `undefined`.'));
        }
        return null;
      } else {
        return validate(props, propName, componentName, location, propFullName);
      }
    }

    var chainedCheckType = checkType.bind(null, false);
    chainedCheckType.isRequired = checkType.bind(null, true);

    return chainedCheckType;
  }

  function createPrimitiveTypeChecker(expectedType) {
    function validate(props, propName, componentName, location, propFullName, secret) {
      var propValue = props[propName];
      var propType = getPropType(propValue);
      if (propType !== expectedType) {
        // `propValue` being instance of, say, date/regexp, pass the 'object'
        // check, but we can offer a more precise error message here rather than
        // 'of type `object`'.
        var preciseType = getPreciseType(propValue);

        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + preciseType + '` supplied to `' + componentName + '`, expected ') + ('`' + expectedType + '`.'));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createAnyTypeChecker() {
    return createChainableTypeChecker(emptyFunction_1.thatReturnsNull);
  }

  function createArrayOfTypeChecker(typeChecker) {
    function validate(props, propName, componentName, location, propFullName) {
      if (typeof typeChecker !== 'function') {
        return new PropTypeError('Property `' + propFullName + '` of component `' + componentName + '` has invalid PropType notation inside arrayOf.');
      }
      var propValue = props[propName];
      if (!Array.isArray(propValue)) {
        var propType = getPropType(propValue);
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an array.'));
      }
      for (var i = 0; i < propValue.length; i++) {
        var error = typeChecker(propValue, i, componentName, location, propFullName + '[' + i + ']', ReactPropTypesSecret_1);
        if (error instanceof Error) {
          return error;
        }
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createElementTypeChecker() {
    function validate(props, propName, componentName, location, propFullName) {
      var propValue = props[propName];
      if (!isValidElement(propValue)) {
        var propType = getPropType(propValue);
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected a single ReactElement.'));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createInstanceTypeChecker(expectedClass) {
    function validate(props, propName, componentName, location, propFullName) {
      if (!(props[propName] instanceof expectedClass)) {
        var expectedClassName = expectedClass.name || ANONYMOUS;
        var actualClassName = getClassName(props[propName]);
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + actualClassName + '` supplied to `' + componentName + '`, expected ') + ('instance of `' + expectedClassName + '`.'));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createEnumTypeChecker(expectedValues) {
    if (!Array.isArray(expectedValues)) {
      process.env.NODE_ENV !== 'production' ? warning_1(false, 'Invalid argument supplied to oneOf, expected an instance of array.') : void 0;
      return emptyFunction_1.thatReturnsNull;
    }

    function validate(props, propName, componentName, location, propFullName) {
      var propValue = props[propName];
      for (var i = 0; i < expectedValues.length; i++) {
        if (is(propValue, expectedValues[i])) {
          return null;
        }
      }

      var valuesString = JSON.stringify(expectedValues);
      return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of value `' + propValue + '` ' + ('supplied to `' + componentName + '`, expected one of ' + valuesString + '.'));
    }
    return createChainableTypeChecker(validate);
  }

  function createObjectOfTypeChecker(typeChecker) {
    function validate(props, propName, componentName, location, propFullName) {
      if (typeof typeChecker !== 'function') {
        return new PropTypeError('Property `' + propFullName + '` of component `' + componentName + '` has invalid PropType notation inside objectOf.');
      }
      var propValue = props[propName];
      var propType = getPropType(propValue);
      if (propType !== 'object') {
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type ' + ('`' + propType + '` supplied to `' + componentName + '`, expected an object.'));
      }
      for (var key in propValue) {
        if (propValue.hasOwnProperty(key)) {
          var error = typeChecker(propValue, key, componentName, location, propFullName + '.' + key, ReactPropTypesSecret_1);
          if (error instanceof Error) {
            return error;
          }
        }
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createUnionTypeChecker(arrayOfTypeCheckers) {
    if (!Array.isArray(arrayOfTypeCheckers)) {
      process.env.NODE_ENV !== 'production' ? warning_1(false, 'Invalid argument supplied to oneOfType, expected an instance of array.') : void 0;
      return emptyFunction_1.thatReturnsNull;
    }

    for (var i = 0; i < arrayOfTypeCheckers.length; i++) {
      var checker = arrayOfTypeCheckers[i];
      if (typeof checker !== 'function') {
        warning_1(
          false,
          'Invalid argument supplied to oneOfType. Expected an array of check functions, but ' +
          'received %s at index %s.',
          getPostfixForTypeWarning(checker),
          i
        );
        return emptyFunction_1.thatReturnsNull;
      }
    }

    function validate(props, propName, componentName, location, propFullName) {
      for (var i = 0; i < arrayOfTypeCheckers.length; i++) {
        var checker = arrayOfTypeCheckers[i];
        if (checker(props, propName, componentName, location, propFullName, ReactPropTypesSecret_1) == null) {
          return null;
        }
      }

      return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`.'));
    }
    return createChainableTypeChecker(validate);
  }

  function createNodeChecker() {
    function validate(props, propName, componentName, location, propFullName) {
      if (!isNode(props[propName])) {
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` supplied to ' + ('`' + componentName + '`, expected a ReactNode.'));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createShapeTypeChecker(shapeTypes) {
    function validate(props, propName, componentName, location, propFullName) {
      var propValue = props[propName];
      var propType = getPropType(propValue);
      if (propType !== 'object') {
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type `' + propType + '` ' + ('supplied to `' + componentName + '`, expected `object`.'));
      }
      for (var key in shapeTypes) {
        var checker = shapeTypes[key];
        if (!checker) {
          continue;
        }
        var error = checker(propValue, key, componentName, location, propFullName + '.' + key, ReactPropTypesSecret_1);
        if (error) {
          return error;
        }
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }

  function createStrictShapeTypeChecker(shapeTypes) {
    function validate(props, propName, componentName, location, propFullName) {
      var propValue = props[propName];
      var propType = getPropType(propValue);
      if (propType !== 'object') {
        return new PropTypeError('Invalid ' + location + ' `' + propFullName + '` of type `' + propType + '` ' + ('supplied to `' + componentName + '`, expected `object`.'));
      }
      // We need to check all keys in case some are required but missing from
      // props.
      var allKeys = objectAssign({}, props[propName], shapeTypes);
      for (var key in allKeys) {
        var checker = shapeTypes[key];
        if (!checker) {
          return new PropTypeError(
            'Invalid ' + location + ' `' + propFullName + '` key `' + key + '` supplied to `' + componentName + '`.' +
            '\nBad object: ' + JSON.stringify(props[propName], null, '  ') +
            '\nValid keys: ' +  JSON.stringify(Object.keys(shapeTypes), null, '  ')
          );
        }
        var error = checker(propValue, key, componentName, location, propFullName + '.' + key, ReactPropTypesSecret_1);
        if (error) {
          return error;
        }
      }
      return null;
    }

    return createChainableTypeChecker(validate);
  }

  function isNode(propValue) {
    switch (typeof propValue) {
      case 'number':
      case 'string':
      case 'undefined':
        return true;
      case 'boolean':
        return !propValue;
      case 'object':
        if (Array.isArray(propValue)) {
          return propValue.every(isNode);
        }
        if (propValue === null || isValidElement(propValue)) {
          return true;
        }

        var iteratorFn = getIteratorFn(propValue);
        if (iteratorFn) {
          var iterator = iteratorFn.call(propValue);
          var step;
          if (iteratorFn !== propValue.entries) {
            while (!(step = iterator.next()).done) {
              if (!isNode(step.value)) {
                return false;
              }
            }
          } else {
            // Iterator will provide entry [k,v] tuples rather than values.
            while (!(step = iterator.next()).done) {
              var entry = step.value;
              if (entry) {
                if (!isNode(entry[1])) {
                  return false;
                }
              }
            }
          }
        } else {
          return false;
        }

        return true;
      default:
        return false;
    }
  }

  function isSymbol(propType, propValue) {
    // Native Symbol.
    if (propType === 'symbol') {
      return true;
    }

    // 19.4.3.5 Symbol.prototype[@@toStringTag] === 'Symbol'
    if (propValue['@@toStringTag'] === 'Symbol') {
      return true;
    }

    // Fallback for non-spec compliant Symbols which are polyfilled.
    if (typeof Symbol === 'function' && propValue instanceof Symbol) {
      return true;
    }

    return false;
  }

  // Equivalent of `typeof` but with special handling for array and regexp.
  function getPropType(propValue) {
    var propType = typeof propValue;
    if (Array.isArray(propValue)) {
      return 'array';
    }
    if (propValue instanceof RegExp) {
      // Old webkits (at least until Android 4.0) return 'function' rather than
      // 'object' for typeof a RegExp. We'll normalize this here so that /bla/
      // passes PropTypes.object.
      return 'object';
    }
    if (isSymbol(propType, propValue)) {
      return 'symbol';
    }
    return propType;
  }

  // This handles more types than `getPropType`. Only used for error messages.
  // See `createPrimitiveTypeChecker`.
  function getPreciseType(propValue) {
    if (typeof propValue === 'undefined' || propValue === null) {
      return '' + propValue;
    }
    var propType = getPropType(propValue);
    if (propType === 'object') {
      if (propValue instanceof Date) {
        return 'date';
      } else if (propValue instanceof RegExp) {
        return 'regexp';
      }
    }
    return propType;
  }

  // Returns a string that is postfixed to a warning about an invalid type.
  // For example, "undefined" or "of type array"
  function getPostfixForTypeWarning(value) {
    var type = getPreciseType(value);
    switch (type) {
      case 'array':
      case 'object':
        return 'an ' + type;
      case 'boolean':
      case 'date':
      case 'regexp':
        return 'a ' + type;
      default:
        return type;
    }
  }

  // Returns class name of the object, if any.
  function getClassName(propValue) {
    if (!propValue.constructor || !propValue.constructor.name) {
      return ANONYMOUS;
    }
    return propValue.constructor.name;
  }

  ReactPropTypes.checkPropTypes = checkPropTypes_1;
  ReactPropTypes.PropTypes = ReactPropTypes;

  return ReactPropTypes;
};

var factoryWithThrowingShims = function() {
  function shim(props, propName, componentName, location, propFullName, secret) {
    if (secret === ReactPropTypesSecret_1) {
      // It is still safe when called from React.
      return;
    }
    invariant_1(
      false,
      'Calling PropTypes validators directly is not supported by the `prop-types` package. ' +
      'Use PropTypes.checkPropTypes() to call them. ' +
      'Read more at http://fb.me/use-check-prop-types'
    );
  }
  shim.isRequired = shim;
  function getShim() {
    return shim;
  }
  // Important!
  // Keep this list in sync with production version in `./factoryWithTypeCheckers.js`.
  var ReactPropTypes = {
    array: shim,
    bool: shim,
    func: shim,
    number: shim,
    object: shim,
    string: shim,
    symbol: shim,

    any: shim,
    arrayOf: getShim,
    element: shim,
    instanceOf: getShim,
    node: shim,
    objectOf: getShim,
    oneOf: getShim,
    oneOfType: getShim,
    shape: getShim,
    exact: getShim
  };

  ReactPropTypes.checkPropTypes = emptyFunction_1;
  ReactPropTypes.PropTypes = ReactPropTypes;

  return ReactPropTypes;
};

var propTypes = createCommonjsModule(function (module) {
/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

if (process.env.NODE_ENV !== 'production') {
  var REACT_ELEMENT_TYPE = (typeof Symbol === 'function' &&
    Symbol.for &&
    Symbol.for('react.element')) ||
    0xeac7;

  var isValidElement = function(object) {
    return typeof object === 'object' &&
      object !== null &&
      object.$$typeof === REACT_ELEMENT_TYPE;
  };

  // By explicitly using `prop-types` you are opting into new development behavior.
  // http://fb.me/prop-types-in-prod
  var throwOnDirectAccess = true;
  module.exports = factoryWithTypeCheckers(isValidElement, throwOnDirectAccess);
} else {
  // By explicitly using `prop-types` you are opting into new production behavior.
  // http://fb.me/prop-types-in-prod
  module.exports = factoryWithThrowingShims();
}
});

var camel2hyphen = function (str) {
  return str
          .replace(/[A-Z]/g, function (match) {
            return '-' + match.toLowerCase();
          })
          .toLowerCase();
};

var camel2hyphen_1 = camel2hyphen;

var isDimension = function (feature) {
  var re = /[height|width]$/;
  return re.test(feature);
};

var obj2mq = function (obj) {
  var mq = '';
  var features = Object.keys(obj);
  features.forEach(function (feature, index) {
    var value = obj[feature];
    feature = camel2hyphen_1(feature);
    // Add px to dimension features
    if (isDimension(feature) && typeof value === 'number') {
      value = value + 'px';
    }
    if (value === true) {
      mq += feature;
    } else if (value === false) {
      mq += 'not ' + feature;
    } else {
      mq += '(' + feature + ': ' + value + ')';
    }
    if (index < features.length-1) {
      mq += ' and ';
    }
  });
  return mq;
};

var json2mq = function (query) {
  var mq = '';
  if (typeof query === 'string') {
    return query;
  }
  // Handling array of media queries
  if (query instanceof Array) {
    query.forEach(function (q, index) {
      mq += obj2mq(q);
      if (index < query.length-1) {
        mq += ', ';
      }
    });
    return mq;
  }
  // Handling single media query
  return obj2mq(query);
};

var json2mq_1 = json2mq;

var Media_1 = createCommonjsModule(function (module, exports) {
exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };



var _react2 = _interopRequireDefault(React);



var _propTypes2 = _interopRequireDefault(propTypes);



var _json2mq2 = _interopRequireDefault(json2mq_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Conditionally renders based on whether or not a media query matches.
 */
var Media = function (_React$Component) {
  _inherits(Media, _React$Component);

  function Media() {
    var _temp, _this, _ret;

    _classCallCheck(this, Media);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, _React$Component.call.apply(_React$Component, [this].concat(args))), _this), _this.state = {
      matches: _this.props.defaultMatches
    }, _this.updateMatches = function () {
      return _this.setState({ matches: _this.mediaQueryList.matches });
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  Media.prototype.componentWillMount = function componentWillMount() {
    if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) !== 'object') return;

    var query = this.props.query;


    if (typeof query !== 'string') query = (0, _json2mq2.default)(query);

    this.mediaQueryList = window.matchMedia(query);
    this.mediaQueryList.addListener(this.updateMatches);
    this.updateMatches();
  };

  Media.prototype.componentWillUnmount = function componentWillUnmount() {
    this.mediaQueryList.removeListener(this.updateMatches);
  };

  Media.prototype.render = function render() {
    var _props = this.props,
        children = _props.children,
        render = _props.render;
    var matches = this.state.matches;


    return render ? matches ? render() : null : children ? typeof children === 'function' ? children(matches) : !Array.isArray(children) || children.length ? // Preact defaults to empty children array
    matches ? _react2.default.Children.only(children) : null : null : null;
  };

  return Media;
}(_react2.default.Component);

Media.propTypes = {
  defaultMatches: _propTypes2.default.bool,
  query: _propTypes2.default.oneOfType([_propTypes2.default.string, _propTypes2.default.object, _propTypes2.default.arrayOf(_propTypes2.default.object.isRequired)]).isRequired,
  render: _propTypes2.default.func,
  children: _propTypes2.default.oneOfType([_propTypes2.default.node, _propTypes2.default.func])
};
Media.defaultProps = {
  defaultMatches: true
};
exports.default = Media;
});

unwrapExports(Media_1);

var reactMedia = createCommonjsModule(function (module) {
var _Media2 = _interopRequireDefault(Media_1);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// TODO: Remove in the next major release.
_Media2.default.Media = _Media2.default; /* eslint-env node */


module.exports = _Media2.default;
});

var Media = unwrapExports(reactMedia);

// These breakpoints values represent minimum screen sizes.
// Small screen sizes should be targetted by default (mobile first).
var BREAKPOINTS = {
  medium: 768,
  large: 1170

  // CSS breakpoints
};var breakpoint = function breakpoint(name, styles) {
  return css(['@media (min-width:', 'px){', ';}'], BREAKPOINTS[name], styles);
};

// Rendering breakpoints
var BreakPoint = function BreakPoint(_ref) {
  var from = _ref.from,
      to = _ref.to,
      children = _ref.children,
      props = objectWithoutProperties(_ref, ['from', 'to', 'children']);

  var names = ['medium', 'large'];
  var query = {};
  if (from && names.includes(from)) {
    query.minWidth = BREAKPOINTS[from];
  }
  if (to && names.includes(to)) {
    query.maxWidth = BREAKPOINTS[to] - 1;
  }
  return React.createElement(
    Media,
    _extends({ query: query, defaultMatches: false }, props),
    function (ok) {
      return ok ? children : null;
    }
  );
};

BreakPoint.defaultProps = {
  to: '',
  from: ''
};

var FONT_SIZES = {
  xxsmall: '11px',
  xsmall: '12px',
  small: '14px',
  normal: '15px',
  large: '16px',
  xlarge: '20px',
  xxlarge: '22px',
  great: '37px'
};

var FONT_WEIGHTS = {
  normal: '400',
  bold: '600',
  bolder: '800'
};

var font = function font(_ref) {
  var _ref$size = _ref.size,
      size = _ref$size === undefined ? 'normal' : _ref$size,
      _ref$weight = _ref.weight,
      weight = _ref$weight === undefined ? 'normal' : _ref$weight;

  var fontSize = FONT_SIZES[size] || FONT_SIZES.normal;
  var fontWeight = FONT_WEIGHTS[weight] || FONT_WEIGHTS.normal;
  return '\n    font-size: ' + fontSize + ';\n    font-weight: ' + fontWeight + ';\n    line-height: 1.5;\n  ';
};

var GRID = {
  columns: 12,
  gutterWidth: 30,
  columnWidth: 68
};

var grid = function grid(cols) {
  var gutters = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : cols - 1;
  return GRID.columnWidth * cols + GRID.gutterWidth * gutters;
};

var SPRINGS = {
  slow: { stiffness: 150, damping: 18, precision: 0.001 },
  normal: { stiffness: 190, damping: 22, precision: 0.001 },
  fast: { stiffness: 220, damping: 24, precision: 0.001 }
};


var spring = function spring(name) {
  return SPRINGS[name] || SPRINGS.normal;
};

var unselectable = function unselectable() {
  return '\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n';
};

// Higher-order component for re-rendering
// For a discussion on pitfalls, see https://gist.github.com/staltz/08bf613199092eeb41ac8137d51eb5e6#gistcomment-2280414
var redraw = function redraw(delay) {
  return function (Component) {
    var _class, _temp2;

    return _temp2 = _class = function (_React$Component) {
      inherits(_class, _React$Component);

      function _class() {
        var _ref;

        var _temp, _this, _ret;

        classCallCheck(this, _class);

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = _class.__proto__ || Object.getPrototypeOf(_class)).call.apply(_ref, [this].concat(args))), _this), _this.draw = function () {
          _this.raf = requestAnimationFrame(_this.draw);

          var now = Date.now();
          var delta = now - _this.lastDraw;
          if (delta > delay) {
            _this.child ? _this.child.forceUpdate() : _this.forceUpdate();
            _this.lastDraw = now - delta % delay;
          }
        }, _temp), possibleConstructorReturn(_this, _ret);
      }

      createClass(_class, [{
        key: 'componentDidMount',
        value: function componentDidMount() {
          this.raf = null;
          this.lastDraw = Date.now();
          this.draw();
        }
      }, {
        key: 'componentWillUnmount',
        value: function componentWillUnmount() {
          this.raf && cancelAnimationFrame(this.raf);
        }
      }, {
        key: 'render',
        value: function render() {
          var _this2 = this;

          return React.createElement(Component, _extends({}, this.props, {
            ref:
            // Only add a ref prop if the given component is not a stateless
            // component
            Component.render ? function (child) {
              _this2.child = child;
              _this2.props.innerRef(child);
            } : undefined
          }));
        }
      }]);
      return _class;
    }(React.Component), _class.propTypes = {
      innerRef: propTypes.func
    }, _class.defaultProps = {
      innerRef: function innerRef() {}
    }, _class.displayName = 'Redraw(' + getDisplayName(Component) + ')', _temp2;
  };
};

var EVERY_SECOND = 1000;
var EVERY_MINUTE = EVERY_SECOND * 60;
var EVERY_HOUR = EVERY_MINUTE * 60;

var getRedrawTime = function getRedrawTime(fromDate) {
  var _difference = difference(new Date(), fromDate),
      days = _difference.days,
      hours = _difference.hours,
      minutes = _difference.minutes;

  return hours || days ? EVERY_HOUR : minutes ? EVERY_MINUTE : EVERY_SECOND;
};

// Higher-order component for re-rendering based on a given date
// Automatically adjusts the re-render timer to be one second, minute, or hour
// based on the fromDate.
// For a discussion on pitfalls, see https://gist.github.com/staltz/08bf613199092eeb41ac8137d51eb5e6#gistcomment-2280414
var redrawFromDate = function redrawFromDate(Component) {
  var _class, _temp2;

  return _temp2 = _class = function (_React$Component) {
    inherits(_class, _React$Component);

    function _class() {
      var _ref;

      var _temp, _this, _ret;

      classCallCheck(this, _class);

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = _class.__proto__ || Object.getPrototypeOf(_class)).call.apply(_ref, [this].concat(args))), _this), _this.clearInterval = function () {
        _this.interval && clearInterval(_this.interval);
      }, _this.restartDrawInterval = function (redrawTime) {
        _this.clearInterval();

        _this.interval = setInterval(function () {
          _this.child ? _this.child.forceUpdate() : _this.forceUpdate();

          var newRedrawTime = getRedrawTime(_this.props.fromDate);
          if (newRedrawTime !== redrawTime) {
            _this.restartDrawInterval(newRedrawTime);
          }
        }, redrawTime);
      }, _temp), possibleConstructorReturn(_this, _ret);
    }

    createClass(_class, [{
      key: 'componentDidMount',
      value: function componentDidMount() {
        var fromDate = this.props.fromDate;

        if (fromDate) {
          this.restartDrawInterval(getRedrawTime(this.props.fromDate));
        }
      }
    }, {
      key: 'componentWillReceiveProps',
      value: function componentWillReceiveProps(_ref2) {
        var fromDate = _ref2.fromDate;

        if (!fromDate && this.props.fromDate) {
          this.clearInterval();
        } else if (!isEqual(fromDate, this.props.fromDate)) {
          this.restartDrawInterval(getRedrawTime(this.props.fromDate));
        }
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        this.clearInterval();
      }
    }, {
      key: 'render',
      value: function render() {
        var _this2 = this;

        return React.createElement(Component, _extends({}, this.props, {
          ref:
          // Only add a ref prop if the given component is not a stateless
          // component
          Component.render ? function (child) {
            _this2.child = child;
            _this2.props.innerRef(child);
          } : undefined
        }));
      }
    }]);
    return _class;
  }(React.Component), _class.propTypes = {
    fromDate: propTypes.oneOfType([propTypes.string, propTypes.number, propTypes.instanceOf(Date)]),
    innerRef: propTypes.func
  }, _class.defaultProps = {
    innerRef: function innerRef() {}
  }, _class.displayName = 'RedrawFromDate(' + getDisplayName(Component) + ')', _temp2;
};

// High order component wrapper
var getPublicUrl = function getPublicUrl(Component) {
  var highOrderComponent = function highOrderComponent(baseProps, context) {
    var _context$publicUrl = context.publicUrl,
        publicUrl = _context$publicUrl === undefined ? '' : _context$publicUrl;

    var props = _extends({}, baseProps, { publicUrl: publicUrl });
    return React.createElement(Component, props);
  };
  highOrderComponent.contextTypes = {
    publicUrl: propTypes.string
  };
  return highOrderComponent;
};

// prefix helper
var prefixUrl = function prefixUrl(url, publicUrl) {
  return url.startsWith('data:') ? url : publicUrl + url;
};

// styled-component helper
var styledPublicUrl = function styledPublicUrl(url) {
  return function (_ref) {
    var publicUrl = _ref.publicUrl;
    return prefixUrl(url, publicUrl);
  };
};

var overpassLightWoff = "fd48a701d84ebf69.woff";

var overpassLightWoff2 = "cf790334a5a6d45c.woff2";

var overpassRegularWoff = "860b19d3e10736e7.woff";

var overpassRegularWoff2 = "32a3f11e7740ce58.woff2";

var overpassSemiBoldWoff = "f8ba2d7a9af0db1f.woff";

var overpassSemiBoldWoff2 = "5cfe62515c2f9b42.woff2";

var _templateObject = taggedTemplateLiteral(['\n  @font-face {\n    font-family: \'overpass\';\n    src: ', ';\n    font-weight: 400;\n    font-style: normal;\n  }\n  @font-face {\n    font-family: \'overpass\';\n    src: ', ';\n    font-weight: 600;\n    font-style: normal;\n  }\n  @font-face {\n    font-family: \'overpass\';\n    src: ', ';\n    font-weight: 800;\n    font-style: normal;\n  }\n  *,\n  *:before,\n  *:after {\n    box-sizing: border-box;\n  }\n  html {\n    min-height: 100%;\n  }\n  body {\n    font-family: overpass, sans-serif;\n    font-size: 15px;\n    font-weight: 400;\n    line-height: 1.5;\n    color: ', ';\n    background: ', ';\n  }\n  body,\n  ul,\n  p,\n  h1,\n  h2,\n  h3,\n  h4,\n  h5,\n  h6 {\n    margin: 0;\n    padding: 0;\n  }\n  button,\n  select,\n  input,\n  h1,\n  h2,\n  h3,\n  h4,\n  h5,\n  h6 {\n    font-size: inherit;\n    font-family: inherit;\n    font-weight: inherit;\n    line-height: inherit;\n  }\n  a,\n  button,\n  select,\n  input {\n    color: inherit;\n  }\n  strong,\n  b {\n    font-weight: 600;\n  }\n'], ['\n  @font-face {\n    font-family: \'overpass\';\n    src: ', ';\n    font-weight: 400;\n    font-style: normal;\n  }\n  @font-face {\n    font-family: \'overpass\';\n    src: ', ';\n    font-weight: 600;\n    font-style: normal;\n  }\n  @font-face {\n    font-family: \'overpass\';\n    src: ', ';\n    font-weight: 800;\n    font-style: normal;\n  }\n  *,\n  *:before,\n  *:after {\n    box-sizing: border-box;\n  }\n  html {\n    min-height: 100%;\n  }\n  body {\n    font-family: overpass, sans-serif;\n    font-size: 15px;\n    font-weight: 400;\n    line-height: 1.5;\n    color: ', ';\n    background: ', ';\n  }\n  body,\n  ul,\n  p,\n  h1,\n  h2,\n  h3,\n  h4,\n  h5,\n  h6 {\n    margin: 0;\n    padding: 0;\n  }\n  button,\n  select,\n  input,\n  h1,\n  h2,\n  h3,\n  h4,\n  h5,\n  h6 {\n    font-size: inherit;\n    font-family: inherit;\n    font-weight: inherit;\n    line-height: inherit;\n  }\n  a,\n  button,\n  select,\n  input {\n    color: inherit;\n  }\n  strong,\n  b {\n    font-weight: 600;\n  }\n']);

var BaseStyles = function (_React$Component) {
  inherits(BaseStyles, _React$Component);

  function BaseStyles() {
    classCallCheck(this, BaseStyles);
    return possibleConstructorReturn(this, (BaseStyles.__proto__ || Object.getPrototypeOf(BaseStyles)).apply(this, arguments));
  }

  createClass(BaseStyles, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _props = this.props,
          publicUrl = _props.publicUrl,
          enableLegacyFonts = _props.enableLegacyFonts;

      injectStyles(function (url) {
        return publicUrl + url;
      }, enableLegacyFonts);
    }
  }, {
    key: 'render',
    value: function render() {
      return null;
    }
  }]);
  return BaseStyles;
}(React.Component);

BaseStyles.propTypes = {
  publicUrl: propTypes.string,
  enableLegacyFonts: propTypes.bool
};
BaseStyles.defaultProps = {
  publicUrl: '/',
  enableLegacyFonts: false
};


var fontSrc = function fontSrc(sources) {
  return sources.filter(function (_ref) {
    var enable = _ref.enable;
    return enable;
  }).map(function (_ref2) {
    var url = _ref2.url,
        format = _ref2.format;
    return 'url(' + url + ') format(\'' + format + '\')';
  }).join(', ');
};

var injectStyles = function injectStyles(asset, legacyFonts) {
  return injectGlobal(_templateObject, fontSrc([{ url: asset(overpassLightWoff2), format: 'woff2', enable: true }, { url: asset(overpassLightWoff), format: 'woff', enable: legacyFonts }]), fontSrc([{ url: asset(overpassRegularWoff2), format: 'woff2', enable: true }, { url: asset(overpassRegularWoff), format: 'woff', enable: legacyFonts }]), fontSrc([{ url: asset(overpassSemiBoldWoff2), format: 'woff2', enable: true }, { url: asset(overpassSemiBoldWoff), format: 'woff', enable: legacyFonts }]), theme.textPrimary, theme.mainBackground);
};

var BaseStyles$1 = getPublicUrl(BaseStyles);

var StyledContent = styled.div.withConfig({
  displayName: 'Section__StyledContent'
})(['width:100%;margin:0 auto;max-width:', 'px;'], function (_ref) {
  var large = _ref.large;
  return grid(large ? 12 : 10);
});

var DefaultProps = {
  large: false,
  visual: false
};

var Section = function Section(_ref2) {
  var large = _ref2.large,
      visual = _ref2.visual,
      className = _ref2.className,
      publicUrl = _ref2.publicUrl,
      props = objectWithoutProperties(_ref2, ['large', 'visual', 'className', 'publicUrl']);

  var containerProps = { className: className };
  var content = React.createElement(
    StyledContent,
    { large: large },
    React.createElement('div', props)
  );
  if (visual) return React.createElement(
    'div',
    containerProps,
    content
  );
  return React.createElement(
    'section',
    containerProps,
    content
  );
};

Section.defaultProps = DefaultProps;

var medium = function medium(css$$1) {
  return breakpoint('medium', css$$1);
};
var large = function large(css$$1) {
  return breakpoint('large', css$$1);
};

var StyledIllustratedSection = styled(Section).withConfig({
  displayName: 'IllustratedSection__StyledIllustratedSection'
})(['padding:120px 15px 120px;.main{display:block;align-items:center;', ';}.text{margin-top:20px;', ';', ';}'], large('display: flex'), medium('\n      display: flex;\n      margin-top: 40px;\n    '), large('\n      display: block;\n      margin-top: 0;\n    '));

var StyledIllustration = styled.div.withConfig({
  displayName: 'IllustratedSection__StyledIllustration'
})(['margin-top:40px;img{display:block;margin:0 auto;max-width:calc(100% - 30px);}', ';'], large('\n    flex-shrink: 0;\n    width: calc(40% + 150px);\n    margin-left: 50px;\n    margin-right: -100px;\n    margin-top: 0;\n    padding: 0 70px;\n    &:first-child {\n      margin-left: -100px;\n      margin-right: 50px;\n    }\n    img {\n      width: 100%;\n      margin: 0;\n    }\n  '));

var StyledTitle = styled.div.withConfig({
  displayName: 'IllustratedSection__StyledTitle'
})(['margin-bottom:10px;font-size:15px;text-align:center;text-transform:uppercase;color:', ';font-weight:600;', ';', ';'], theme.accent, medium('\n    font-size: 18px;\n  '), large('\n    text-align: left;\n  '));

var StyledSubtitle = styled.div.withConfig({
  displayName: 'IllustratedSection__StyledSubtitle'
})(['font-size:25px;font-weight:200;line-height:1.3;text-align:center;color:', ';', ';', ';'], function (_ref) {
  var dark = _ref.dark;
  return dark ? 'white' : 'black';
}, medium('\n    font-size: 37px;\n  '), large('\n    text-align: left;\n  '));

var StyledEmphasis = styled.div.withConfig({
  displayName: 'IllustratedSection__StyledEmphasis'
})(['margin:0 0 30px;padding-left:30px;font-size:18px;border-left:4px solid ', ';color:', ';', ';', ';'], theme.accent, function (_ref2) {
  var dark = _ref2.dark;
  return dark ? 'white' : 'black';
}, medium('\n    margin: 0 30px 40px 0;\n    font-size: 19px;\n  '), large('\n    margin: 40px 0;\n  '));

var StyledContent$1 = styled.div.withConfig({
  displayName: 'IllustratedSection__StyledContent'
})(['font-size:17px;color:', ';', ';p{margin-bottom:1em;}p:last-child{margin-bottom:0;}'], function (_ref3) {
  var dark = _ref3.dark;
  return dark ? themeDark.textSecondary : 'black';
}, medium('\n    font-size: 18px;\n  '));

var DefaultProps$1 = {
  dark: false
};

var childrenComponents = {
  Illustration: StyledIllustration,
  Title: StyledTitle,
  Subtitle: StyledSubtitle,
  Emphasis: StyledEmphasis,
  Content: StyledContent$1
};

var IllustratedSection = function IllustratedSection(_ref4) {
  var className = _ref4.className,
      dark = _ref4.dark,
      children = _ref4.children;

  // Using proxiedComponents instead of childrenComponents is a way to
  // circumvent the react-hot-loader proxy wrapper.
  //
  // See https://github.com/gaearon/react-hot-loader/issues/304
  var proxiedComponents = Object.keys(childrenComponents).map(function (name) {
    var Comp = childrenComponents[name];
    return [name, Comp, React.createElement(Comp, null).type];
  });
  var elementType = function elementType(elt) {
    var compGroup = proxiedComponents.find(function (_ref5) {
      var _ref6 = slicedToArray(_ref5, 3),
          name = _ref6[0],
          Comp = _ref6[1],
          ProxiedComp = _ref6[2];

      return elt.type === ProxiedComp;
    });
    if (!compGroup) return { name: '', component: elt.type };
    return { name: compGroup[0], component: compGroup[1] };
  };

  // Collect the elements
  var elts = React.Children.toArray(children).reduce(
  // Fill the .elt property for existing children
  function (elts, elt, i) {
    var _elementType = elementType(elt),
        name = _elementType.name,
        component = _elementType.component;

    if (!elts[name]) return elts;

    elts[name].elt = elt;

    if (component === childrenComponents.Illustration) {
      elts[name].first = i === 0;
    }
    return elts;
  },

  // Fill the initial elts object with { elt: null } entries
  Object.keys(childrenComponents).reduce(function (elts, name) {
    elts[name] = { elt: null, first: false };
    return elts;
  }, {}));

  var illustration = elts.Illustration,
      title = elts.Title,
      subtitle = elts.Subtitle,
      emphasis = elts.Emphasis,
      content = elts.Content;


  return React.createElement(
    StyledIllustratedSection,
    { className: className },
    React.createElement(
      BreakPoint,
      { to: 'large' },
      React.createElement(
        'div',
        { className: 'main' },
        title.elt,
        subtitle.elt,
        illustration.elt,
        React.createElement(
          'div',
          { className: 'text' },
          emphasis.elt,
          content.elt
        )
      )
    ),
    React.createElement(
      BreakPoint,
      { from: 'large' },
      React.createElement(
        'div',
        { className: 'main' },
        illustration.first && illustration.elt,
        React.createElement(
          'div',
          { className: 'text' },
          title.elt,
          subtitle.elt,
          emphasis.elt,
          content.elt
        ),
        !illustration.first && illustration.elt
      )
    )
  );
};

IllustratedSection.defaultProps = DefaultProps$1;

Object.entries(childrenComponents).forEach(function (_ref7) {
  var _ref8 = slicedToArray(_ref7, 2),
      name = _ref8[0],
      comp = _ref8[1];

  // Expose the child component
  IllustratedSection[name] = comp;
});

var Info = function Info(_ref) {
  var children = _ref.children,
      label = _ref.label,
      small = _ref.small,
      props = objectWithoutProperties(_ref, ['children', 'label', 'small']);
  return React.createElement(
    Badge,
    _extends({
      shape: small ? 'smalldisc' : 'disc',
      background: theme.badgeInfoBackground,
      foreground: theme.badgeInfoForeground
    }, props),
    children || (typeof label === 'number' ? formatIntegerRange(label) : label)
  );
};

Info.defaultProps = {
  small: false
};

Info.propTypes = {
  children: propTypes.node,
  label: propTypes.oneOfType([propTypes.number, propTypes.string]),
  small: propTypes.bool
};

var Notification = function Notification(_ref) {
  var children = _ref.children,
      label = _ref.label,
      small = _ref.small,
      props = objectWithoutProperties(_ref, ['children', 'label', 'small']);
  return React.createElement(
    Badge,
    _extends({
      shape: small ? 'smalldisc' : 'disc',
      background: theme.badgeNotificationBackground,
      foreground: theme.badgeNotificationForeground
    }, props),
    children || (typeof label === 'number' ? formatIntegerRange(label) : label)
  );
};

Notification.defaultProps = {
  small: false
};

Notification.propTypes = {
  children: propTypes.node,
  label: propTypes.oneOfType([propTypes.number, propTypes.string]),
  small: propTypes.bool
};

var Identity$2 = function Identity(props) {
  return React.createElement(Badge, _extends({
    shape: 'compact',
    background: theme.badgeIdentityBackground,
    foreground: theme.badgeIdentityForeground
  }, props));
};

var App = function App(props) {
  return React.createElement(Badge, _extends({
    shape: 'round',
    background: theme.badgeAppBackground,
    foreground: theme.badgeAppForeground
  }, props));
};

var shapeStyles = function shapeStyles(shape) {
  if (shape === 'disc') {
    return css(['overflow:hidden;padding-top:2px;letter-spacing:-0.5px;justify-content:center;align-items:center;width:18px;height:18px;border-radius:9px;', ';line-height:20px;'], font({ size: 'xsmall', weight: 'bold' }));
  }
  if (shape === 'smalldisc') {
    return css(['overflow:hidden;padding-top:1px;letter-spacing:-1px;justify-content:center;align-items:center;width:14px;height:14px;border-radius:7px;', ';line-height:14px;'], font({ size: 'xxsmall', weight: 'bold' }));
  }
  if (shape === 'compact') {
    return css(['padding:1px 3px 0;border-radius:3px;', ';'], font({ size: 'xxsmall' }));
  }
  // round shape
  return css(['padding:1px 8px 0;border-radius:9px;', ';'], font({ size: 'xsmall' }));
};

var Badge = styled.span.withConfig({
  displayName: 'Badge'
})(['display:inline-flex;font-weight:600;white-space:nowrap;color:', ';background:', ';', ';'], function (_ref) {
  var foreground = _ref.foreground;
  return foreground;
}, function (_ref2) {
  var background = _ref2.background;
  return background;
}, function (_ref3) {
  var shape = _ref3.shape;
  return shapeStyles(shape);
});

Badge.defaultProps = {
  shape: 'round',
  foreground: colors.Purple.Portage,
  background: colors.Purple.Lavender
};

Badge.propTypes = {
  shape: propTypes.oneOf(['disc', 'smalldisc', 'compact', 'round']),
  background: propTypes.string,
  foreground: propTypes.string
};

Badge.Info = Info;
Badge.Notification = Notification;
Badge.Identity = Identity$2;
Badge.App = App;

var BadgeNumber = function BadgeNumber(_ref) {
  var number = _ref.number,
      small = _ref.small,
      background = _ref.background,
      color = _ref.color,
      props = objectWithoutProperties(_ref, ['number', 'small', 'background', 'color']);
  return React.createElement(
    Badge,
    _extends({
      shape: small ? 'smalldisc' : 'disc',
      background: background,
      foreground: color
    }, props),
    number
  );
};

BadgeNumber.defaultProps = {
  number: 0,
  small: false,
  color: theme.positiveText,
  background: theme.positive
};

var SafeLink = styled.a.attrs({
  // See https://mathiasbynens.github.io/rel-noopener
  rel: 'noopener noreferrer'
}).withConfig({
  displayName: 'SafeLink'
})(['']);

var cross = "data:image/svg+xml,%3Csvg%20width%3D%2211%22%20height%3D%2211%22%20viewBox%3D%220%200%2011%2011%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M10.476%201.524L6.3%205.7l4.176%204.176-1.062%201.062-4.176-4.176-4.176%204.176L0%209.876%204.176%205.7%200%201.524%201.062.462l4.176%204.176L9.414.462z%22%20fill%3D%22%23FB7777%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E";

var check = "data:image/svg+xml,%3Csvg%20width%3D%2214%22%20height%3D%2210%22%20viewBox%3D%220%200%2014%2010%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M4.176%207.956L12.114%200l1.062%201.062-9%209L0%205.886l1.044-1.062z%22%20fill%3D%22%2321D48E%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E";

var crossWhite = "data:image/svg+xml,%3Csvg%20width%3D%2211%22%20height%3D%2211%22%20viewBox%3D%220%200%2011%2011%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M10.476%201.062L6.3%205.238l4.176%204.176-1.062%201.062L5.238%206.3l-4.176%204.176L0%209.414l4.176-4.176L0%201.062%201.062%200l4.176%204.176L9.414%200z%22%20fill%3D%22%23FFF%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E";

var checkWhite = "data:image/svg+xml,%3Csvg%20width%3D%2214%22%20height%3D%2210%22%20viewBox%3D%220%200%2014%2010%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M4.176%207.956L12.114%200l1.062%201.062-9%209L0%205.886l1.044-1.062z%22%20fill%3D%22%23FFF%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E";

var _templateObject$1 = taggedTemplateLiteral(['\n    display: inline-block;\n    text-decoration: none;\n  '], ['\n    display: inline-block;\n    text-decoration: none;\n  ']);

var gradientStart = theme.gradientStart;
var gradientEnd = theme.gradientEnd;
var gradientStartActive = theme.gradientStartActive;
var gradientEndActive = theme.gradientEndActive;
var gradientText = theme.gradientText;
var contentBackground = theme.contentBackground;
var contentBorder = theme.contentBorder;
var contentBorderActive = theme.contentBorderActive;
var secondaryBackground = theme.secondaryBackground;
var textPrimary = theme.textPrimary;
var textSecondary = theme.textSecondary;
var disabledColor = theme.disabled;
var disabledText = theme.disabledText;

// Plain button = normal or strong

var plainButtonStyles = css(['position:relative;overflow:hidden;box-shadow:0 1px 1px rgba(0,0,0,0);&:after{content:\'\';opacity:0;position:absolute;z-index:-1;top:0;left:0;right:0;bottom:0;}', ';'], function (_ref) {
  var disabled = _ref.disabled;
  return disabled ? '' : css(['&:hover,&:focus{box-shadow:', ';}&:active{transform:translateY(1px);box-shadow:0 1px 1px rgba(0,0,0,0);&:after{opacity:1;}}'], function (_ref2) {
    var disabled = _ref2.disabled;
    return disabled ? 'none' : '0 1px 1px rgba(0, 0, 0, 0.2)';
  });
});

var modeNormal = css(['', ';&:active{color:', ';}'], plainButtonStyles, textPrimary);

var modeSecondary = css(['', ';background:', ';&:hover,&:focus{box-shadow:none;}'], plainButtonStyles, secondaryBackground);

var modeStrong = css(['', ';', ';', ';'], plainButtonStyles, font({ size: 'small', weight: 'bold' }), function (_ref3) {
  var disabled = _ref3.disabled;
  return disabled ? css(['color:', ';background-color:', ';background-image:none;'], disabledText, disabledColor) : css(['color:', ';background-color:transparent;background-image:linear-gradient( 130deg,', ',', ' )};&:after{background-image:linear-gradient( 130deg,', ',', ' );}'], gradientText, gradientStart, gradientEnd, gradientStartActive, gradientEndActive);
});

var modeOutline = css(['background:transparent;padding-top:9px;padding-bottom:9px;border:1px solid ', ';&:hover,&:focus{border-color:', ';}&:active{color:', ';border-color:', ';}'], contentBorder, contentBorderActive, textPrimary, textPrimary);

var modeText = css(['padding:10px;background:transparent;&:active,&:focus{color:', ';}'], textPrimary);

var compactStyle = css(['padding:', ';'], function (_ref4) {
  var mode = _ref4.mode;
  return mode === 'outline' ? '4px 14px' : '5px 15px';
});

var positiveStyle = css(['padding-left:34px;background:url(', ') no-repeat 12px calc(50% - 1px);', ';'], styledPublicUrl(check), function (_ref5) {
  var mode = _ref5.mode;

  if (mode !== 'strong') return '';
  return css(['&,&:active{background-image:url(', ');background-color:', ';}&:after{background:none;}'], styledPublicUrl(checkWhite), theme.positive);
});

var negativeStyle = css(['padding-left:30px;background:url(', ') no-repeat 10px calc(50% - 1px);', ';'], styledPublicUrl(cross), function (_ref6) {
  var mode = _ref6.mode;

  if (mode !== 'strong') return '';
  return css(['&,&:active{background-image:url(', ');background-color:', ';}&:after{background:none;}'], styledPublicUrl(crossWhite), theme.negative);
});

var StyledButton = styled.button.attrs({ type: 'button' }).withConfig({
  displayName: 'Button__StyledButton'
})(['width:', ';padding:10px 15px;white-space:nowrap;', ';color:', ';background:', ';border:0;border-radius:3px;outline:0;cursor:', ';&,&:after{transition-property:all;transition-duration:100ms;transition-timing-function:ease-in-out;}&::-moz-focus-inner{border:0;}', ';', ';', ';'], function (_ref7) {
  var wide = _ref7.wide;
  return wide ? '100%' : 'auto';
}, font({ size: 'small', weight: 'normal' }), textSecondary, contentBackground, function (_ref8) {
  var disabled = _ref8.disabled;
  return disabled ? 'default' : 'pointer';
}, function (_ref9) {
  var mode = _ref9.mode;

  if (mode === 'secondary') return modeSecondary;
  if (mode === 'strong') return modeStrong;
  if (mode === 'outline') return modeOutline;
  if (mode === 'text') return modeText;
  return modeNormal;
}, function (_ref10) {
  var compact = _ref10.compact;
  return compact ? compactStyle : '';
}, function (_ref11) {
  var emphasis = _ref11.emphasis;

  if (emphasis === 'positive') return positiveStyle;
  if (emphasis === 'negative') return negativeStyle;
  return '';
});

var Button = getPublicUrl(StyledButton);
var Anchor = getPublicUrl(StyledButton.withComponent(SafeLink).extend(_templateObject$1));

Button.Anchor = Anchor;

var mapToZero_1 = createCommonjsModule(function (module, exports) {
// currently used to initiate the velocity style object to 0
exports.__esModule = true;
exports['default'] = mapToZero;

function mapToZero(obj) {
  var ret = {};
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      ret[key] = 0;
    }
  }
  return ret;
}

module.exports = exports['default'];
});

unwrapExports(mapToZero_1);

var stripStyle_1 = createCommonjsModule(function (module, exports) {
// turn {x: {val: 1, stiffness: 1, damping: 2}, y: 2} generated by
// `{x: spring(1, {stiffness: 1, damping: 2}), y: 2}` into {x: 1, y: 2}

exports.__esModule = true;
exports['default'] = stripStyle;

function stripStyle(style) {
  var ret = {};
  for (var key in style) {
    if (!Object.prototype.hasOwnProperty.call(style, key)) {
      continue;
    }
    ret[key] = typeof style[key] === 'number' ? style[key] : style[key].val;
  }
  return ret;
}

module.exports = exports['default'];
});

unwrapExports(stripStyle_1);

var stepper_1 = createCommonjsModule(function (module, exports) {
// stepper is used a lot. Saves allocation to return the same array wrapper.
// This is fine and danger-free against mutations because the callsite
// immediately destructures it and gets the numbers inside without passing the
exports.__esModule = true;
exports["default"] = stepper;

var reusedTuple = [0, 0];

function stepper(secondPerFrame, x, v, destX, k, b, precision) {
  // Spring stiffness, in kg / s^2

  // for animations, destX is really spring length (spring at rest). initial
  // position is considered as the stretched/compressed position of a spring
  var Fspring = -k * (x - destX);

  // Damping, in kg / s
  var Fdamper = -b * v;

  // usually we put mass here, but for animation purposes, specifying mass is a
  // bit redundant. you could simply adjust k and b accordingly
  // let a = (Fspring + Fdamper) / mass;
  var a = Fspring + Fdamper;

  var newV = v + a * secondPerFrame;
  var newX = x + newV * secondPerFrame;

  if (Math.abs(newV) < precision && Math.abs(newX - destX) < precision) {
    reusedTuple[0] = destX;
    reusedTuple[1] = 0;
    return reusedTuple;
  }

  reusedTuple[0] = newX;
  reusedTuple[1] = newV;
  return reusedTuple;
}

module.exports = exports["default"];
// array reference around.
});

unwrapExports(stepper_1);

var performanceNow = createCommonjsModule(function (module) {
// Generated by CoffeeScript 1.7.1
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(commonjsGlobal);
});

var performanceNow$2 = createCommonjsModule(function (module) {
// Generated by CoffeeScript 1.12.2
(function() {
  var getNanoSeconds, hrtime, loadTime, moduleLoadTime, nodeLoadTime, upTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - nodeLoadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    moduleLoadTime = getNanoSeconds();
    upTime = process.uptime() * 1e9;
    nodeLoadTime = moduleLoadTime - upTime;
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(commonjsGlobal);


});

var root = typeof window === 'undefined' ? commonjsGlobal : window;
var vendors = ['moz', 'webkit'];
var suffix = 'AnimationFrame';
var raf = root['request' + suffix];
var caf = root['cancel' + suffix] || root['cancelRequest' + suffix];

for(var i = 0; !raf && i < vendors.length; i++) {
  raf = root[vendors[i] + 'Request' + suffix];
  caf = root[vendors[i] + 'Cancel' + suffix]
      || root[vendors[i] + 'CancelRequest' + suffix];
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60;

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = performanceNow$2()
        , next = Math.max(0, frameDuration - (_now - last));
      last = next + _now;
      setTimeout(function() {
        var cp = queue.slice(0);
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0;
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last);
            } catch(e) {
              setTimeout(function() { throw e }, 0);
            }
          }
        }
      }, Math.round(next));
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    });
    return id
  };

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true;
      }
    }
  };
}

var raf_1 = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf.call(root, fn)
};
var cancel = function() {
  caf.apply(root, arguments);
};
var polyfill = function(object) {
  if (!object) {
    object = root;
  }
  object.requestAnimationFrame = raf;
  object.cancelAnimationFrame = caf;
};

raf_1.cancel = cancel;
raf_1.polyfill = polyfill;

var shouldStopAnimation_1 = createCommonjsModule(function (module, exports) {
// usage assumption: currentStyle values have already been rendered but it says
// nothing of whether currentStyle is stale (see unreadPropStyle)
exports.__esModule = true;
exports['default'] = shouldStopAnimation;

function shouldStopAnimation(currentStyle, style, currentVelocity) {
  for (var key in style) {
    if (!Object.prototype.hasOwnProperty.call(style, key)) {
      continue;
    }

    if (currentVelocity[key] !== 0) {
      return false;
    }

    var styleValue = typeof style[key] === 'number' ? style[key] : style[key].val;
    // stepper will have already taken care of rounding precision errors, so
    // won't have such thing as 0.9999 !=== 1
    if (currentStyle[key] !== styleValue) {
      return false;
    }
  }

  return true;
}

module.exports = exports['default'];
});

unwrapExports(shouldStopAnimation_1);

var Motion_1 = createCommonjsModule(function (module, exports) {
exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }



var _mapToZero2 = _interopRequireDefault(mapToZero_1);



var _stripStyle2 = _interopRequireDefault(stripStyle_1);



var _stepper4 = _interopRequireDefault(stepper_1);



var _performanceNow2 = _interopRequireDefault(performanceNow);



var _raf2 = _interopRequireDefault(raf_1);



var _shouldStopAnimation2 = _interopRequireDefault(shouldStopAnimation_1);



var _react2 = _interopRequireDefault(React);



var _propTypes2 = _interopRequireDefault(propTypes);

var msPerFrame = 1000 / 60;

var Motion = (function (_React$Component) {
  _inherits(Motion, _React$Component);

  _createClass(Motion, null, [{
    key: 'propTypes',
    value: {
      // TOOD: warn against putting a config in here
      defaultStyle: _propTypes2['default'].objectOf(_propTypes2['default'].number),
      style: _propTypes2['default'].objectOf(_propTypes2['default'].oneOfType([_propTypes2['default'].number, _propTypes2['default'].object])).isRequired,
      children: _propTypes2['default'].func.isRequired,
      onRest: _propTypes2['default'].func
    },
    enumerable: true
  }]);

  function Motion(props) {
    var _this = this;

    _classCallCheck(this, Motion);

    _React$Component.call(this, props);
    this.wasAnimating = false;
    this.animationID = null;
    this.prevTime = 0;
    this.accumulatedTime = 0;
    this.unreadPropStyle = null;

    this.clearUnreadPropStyle = function (destStyle) {
      var dirty = false;
      var _state = _this.state;
      var currentStyle = _state.currentStyle;
      var currentVelocity = _state.currentVelocity;
      var lastIdealStyle = _state.lastIdealStyle;
      var lastIdealVelocity = _state.lastIdealVelocity;

      for (var key in destStyle) {
        if (!Object.prototype.hasOwnProperty.call(destStyle, key)) {
          continue;
        }

        var styleValue = destStyle[key];
        if (typeof styleValue === 'number') {
          if (!dirty) {
            dirty = true;
            currentStyle = _extends({}, currentStyle);
            currentVelocity = _extends({}, currentVelocity);
            lastIdealStyle = _extends({}, lastIdealStyle);
            lastIdealVelocity = _extends({}, lastIdealVelocity);
          }

          currentStyle[key] = styleValue;
          currentVelocity[key] = 0;
          lastIdealStyle[key] = styleValue;
          lastIdealVelocity[key] = 0;
        }
      }

      if (dirty) {
        _this.setState({ currentStyle: currentStyle, currentVelocity: currentVelocity, lastIdealStyle: lastIdealStyle, lastIdealVelocity: lastIdealVelocity });
      }
    };

    this.startAnimationIfNecessary = function () {
      // TODO: when config is {a: 10} and dest is {a: 10} do we raf once and
      // call cb? No, otherwise accidental parent rerender causes cb trigger
      _this.animationID = _raf2['default'](function (timestamp) {
        // check if we need to animate in the first place
        var propsStyle = _this.props.style;
        if (_shouldStopAnimation2['default'](_this.state.currentStyle, propsStyle, _this.state.currentVelocity)) {
          if (_this.wasAnimating && _this.props.onRest) {
            _this.props.onRest();
          }

          // no need to cancel animationID here; shouldn't have any in flight
          _this.animationID = null;
          _this.wasAnimating = false;
          _this.accumulatedTime = 0;
          return;
        }

        _this.wasAnimating = true;

        var currentTime = timestamp || _performanceNow2['default']();
        var timeDelta = currentTime - _this.prevTime;
        _this.prevTime = currentTime;
        _this.accumulatedTime = _this.accumulatedTime + timeDelta;
        // more than 10 frames? prolly switched browser tab. Restart
        if (_this.accumulatedTime > msPerFrame * 10) {
          _this.accumulatedTime = 0;
        }

        if (_this.accumulatedTime === 0) {
          // no need to cancel animationID here; shouldn't have any in flight
          _this.animationID = null;
          _this.startAnimationIfNecessary();
          return;
        }

        var currentFrameCompletion = (_this.accumulatedTime - Math.floor(_this.accumulatedTime / msPerFrame) * msPerFrame) / msPerFrame;
        var framesToCatchUp = Math.floor(_this.accumulatedTime / msPerFrame);

        var newLastIdealStyle = {};
        var newLastIdealVelocity = {};
        var newCurrentStyle = {};
        var newCurrentVelocity = {};

        for (var key in propsStyle) {
          if (!Object.prototype.hasOwnProperty.call(propsStyle, key)) {
            continue;
          }

          var styleValue = propsStyle[key];
          if (typeof styleValue === 'number') {
            newCurrentStyle[key] = styleValue;
            newCurrentVelocity[key] = 0;
            newLastIdealStyle[key] = styleValue;
            newLastIdealVelocity[key] = 0;
          } else {
            var newLastIdealStyleValue = _this.state.lastIdealStyle[key];
            var newLastIdealVelocityValue = _this.state.lastIdealVelocity[key];
            for (var i = 0; i < framesToCatchUp; i++) {
              var _stepper = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

              newLastIdealStyleValue = _stepper[0];
              newLastIdealVelocityValue = _stepper[1];
            }

            var _stepper2 = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

            var nextIdealX = _stepper2[0];
            var nextIdealV = _stepper2[1];

            newCurrentStyle[key] = newLastIdealStyleValue + (nextIdealX - newLastIdealStyleValue) * currentFrameCompletion;
            newCurrentVelocity[key] = newLastIdealVelocityValue + (nextIdealV - newLastIdealVelocityValue) * currentFrameCompletion;
            newLastIdealStyle[key] = newLastIdealStyleValue;
            newLastIdealVelocity[key] = newLastIdealVelocityValue;
          }
        }

        _this.animationID = null;
        // the amount we're looped over above
        _this.accumulatedTime -= framesToCatchUp * msPerFrame;

        _this.setState({
          currentStyle: newCurrentStyle,
          currentVelocity: newCurrentVelocity,
          lastIdealStyle: newLastIdealStyle,
          lastIdealVelocity: newLastIdealVelocity
        });

        _this.unreadPropStyle = null;

        _this.startAnimationIfNecessary();
      });
    };

    this.state = this.defaultState();
  }

  Motion.prototype.defaultState = function defaultState() {
    var _props = this.props;
    var defaultStyle = _props.defaultStyle;
    var style = _props.style;

    var currentStyle = defaultStyle || _stripStyle2['default'](style);
    var currentVelocity = _mapToZero2['default'](currentStyle);
    return {
      currentStyle: currentStyle,
      currentVelocity: currentVelocity,
      lastIdealStyle: currentStyle,
      lastIdealVelocity: currentVelocity
    };
  };

  // it's possible that currentStyle's value is stale: if props is immediately
  // changed from 0 to 400 to spring(0) again, the async currentStyle is still
  // at 0 (didn't have time to tick and interpolate even once). If we naively
  // compare currentStyle with destVal it'll be 0 === 0 (no animation, stop).
  // In reality currentStyle should be 400

  Motion.prototype.componentDidMount = function componentDidMount() {
    this.prevTime = _performanceNow2['default']();
    this.startAnimationIfNecessary();
  };

  Motion.prototype.componentWillReceiveProps = function componentWillReceiveProps(props) {
    if (this.unreadPropStyle != null) {
      // previous props haven't had the chance to be set yet; set them here
      this.clearUnreadPropStyle(this.unreadPropStyle);
    }

    this.unreadPropStyle = props.style;
    if (this.animationID == null) {
      this.prevTime = _performanceNow2['default']();
      this.startAnimationIfNecessary();
    }
  };

  Motion.prototype.componentWillUnmount = function componentWillUnmount() {
    if (this.animationID != null) {
      _raf2['default'].cancel(this.animationID);
      this.animationID = null;
    }
  };

  Motion.prototype.render = function render() {
    var renderedChildren = this.props.children(this.state.currentStyle);
    return renderedChildren && _react2['default'].Children.only(renderedChildren);
  };

  return Motion;
})(_react2['default'].Component);

exports['default'] = Motion;
module.exports = exports['default'];

// after checking for unreadPropStyle != null, we manually go set the
// non-interpolating values (those that are a number, without a spring
// config)
});

unwrapExports(Motion_1);

var StaggeredMotion_1 = createCommonjsModule(function (module, exports) {
exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }



var _mapToZero2 = _interopRequireDefault(mapToZero_1);



var _stripStyle2 = _interopRequireDefault(stripStyle_1);



var _stepper4 = _interopRequireDefault(stepper_1);



var _performanceNow2 = _interopRequireDefault(performanceNow);



var _raf2 = _interopRequireDefault(raf_1);



var _shouldStopAnimation2 = _interopRequireDefault(shouldStopAnimation_1);



var _react2 = _interopRequireDefault(React);



var _propTypes2 = _interopRequireDefault(propTypes);

var msPerFrame = 1000 / 60;

function shouldStopAnimationAll(currentStyles, styles, currentVelocities) {
  for (var i = 0; i < currentStyles.length; i++) {
    if (!_shouldStopAnimation2['default'](currentStyles[i], styles[i], currentVelocities[i])) {
      return false;
    }
  }
  return true;
}

var StaggeredMotion = (function (_React$Component) {
  _inherits(StaggeredMotion, _React$Component);

  _createClass(StaggeredMotion, null, [{
    key: 'propTypes',
    value: {
      // TOOD: warn against putting a config in here
      defaultStyles: _propTypes2['default'].arrayOf(_propTypes2['default'].objectOf(_propTypes2['default'].number)),
      styles: _propTypes2['default'].func.isRequired,
      children: _propTypes2['default'].func.isRequired
    },
    enumerable: true
  }]);

  function StaggeredMotion(props) {
    var _this = this;

    _classCallCheck(this, StaggeredMotion);

    _React$Component.call(this, props);
    this.animationID = null;
    this.prevTime = 0;
    this.accumulatedTime = 0;
    this.unreadPropStyles = null;

    this.clearUnreadPropStyle = function (unreadPropStyles) {
      var _state = _this.state;
      var currentStyles = _state.currentStyles;
      var currentVelocities = _state.currentVelocities;
      var lastIdealStyles = _state.lastIdealStyles;
      var lastIdealVelocities = _state.lastIdealVelocities;

      var someDirty = false;
      for (var i = 0; i < unreadPropStyles.length; i++) {
        var unreadPropStyle = unreadPropStyles[i];
        var dirty = false;

        for (var key in unreadPropStyle) {
          if (!Object.prototype.hasOwnProperty.call(unreadPropStyle, key)) {
            continue;
          }

          var styleValue = unreadPropStyle[key];
          if (typeof styleValue === 'number') {
            if (!dirty) {
              dirty = true;
              someDirty = true;
              currentStyles[i] = _extends({}, currentStyles[i]);
              currentVelocities[i] = _extends({}, currentVelocities[i]);
              lastIdealStyles[i] = _extends({}, lastIdealStyles[i]);
              lastIdealVelocities[i] = _extends({}, lastIdealVelocities[i]);
            }
            currentStyles[i][key] = styleValue;
            currentVelocities[i][key] = 0;
            lastIdealStyles[i][key] = styleValue;
            lastIdealVelocities[i][key] = 0;
          }
        }
      }

      if (someDirty) {
        _this.setState({ currentStyles: currentStyles, currentVelocities: currentVelocities, lastIdealStyles: lastIdealStyles, lastIdealVelocities: lastIdealVelocities });
      }
    };

    this.startAnimationIfNecessary = function () {
      // TODO: when config is {a: 10} and dest is {a: 10} do we raf once and
      // call cb? No, otherwise accidental parent rerender causes cb trigger
      _this.animationID = _raf2['default'](function (timestamp) {
        var destStyles = _this.props.styles(_this.state.lastIdealStyles);

        // check if we need to animate in the first place
        if (shouldStopAnimationAll(_this.state.currentStyles, destStyles, _this.state.currentVelocities)) {
          // no need to cancel animationID here; shouldn't have any in flight
          _this.animationID = null;
          _this.accumulatedTime = 0;
          return;
        }

        var currentTime = timestamp || _performanceNow2['default']();
        var timeDelta = currentTime - _this.prevTime;
        _this.prevTime = currentTime;
        _this.accumulatedTime = _this.accumulatedTime + timeDelta;
        // more than 10 frames? prolly switched browser tab. Restart
        if (_this.accumulatedTime > msPerFrame * 10) {
          _this.accumulatedTime = 0;
        }

        if (_this.accumulatedTime === 0) {
          // no need to cancel animationID here; shouldn't have any in flight
          _this.animationID = null;
          _this.startAnimationIfNecessary();
          return;
        }

        var currentFrameCompletion = (_this.accumulatedTime - Math.floor(_this.accumulatedTime / msPerFrame) * msPerFrame) / msPerFrame;
        var framesToCatchUp = Math.floor(_this.accumulatedTime / msPerFrame);

        var newLastIdealStyles = [];
        var newLastIdealVelocities = [];
        var newCurrentStyles = [];
        var newCurrentVelocities = [];

        for (var i = 0; i < destStyles.length; i++) {
          var destStyle = destStyles[i];
          var newCurrentStyle = {};
          var newCurrentVelocity = {};
          var newLastIdealStyle = {};
          var newLastIdealVelocity = {};

          for (var key in destStyle) {
            if (!Object.prototype.hasOwnProperty.call(destStyle, key)) {
              continue;
            }

            var styleValue = destStyle[key];
            if (typeof styleValue === 'number') {
              newCurrentStyle[key] = styleValue;
              newCurrentVelocity[key] = 0;
              newLastIdealStyle[key] = styleValue;
              newLastIdealVelocity[key] = 0;
            } else {
              var newLastIdealStyleValue = _this.state.lastIdealStyles[i][key];
              var newLastIdealVelocityValue = _this.state.lastIdealVelocities[i][key];
              for (var j = 0; j < framesToCatchUp; j++) {
                var _stepper = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

                newLastIdealStyleValue = _stepper[0];
                newLastIdealVelocityValue = _stepper[1];
              }

              var _stepper2 = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

              var nextIdealX = _stepper2[0];
              var nextIdealV = _stepper2[1];

              newCurrentStyle[key] = newLastIdealStyleValue + (nextIdealX - newLastIdealStyleValue) * currentFrameCompletion;
              newCurrentVelocity[key] = newLastIdealVelocityValue + (nextIdealV - newLastIdealVelocityValue) * currentFrameCompletion;
              newLastIdealStyle[key] = newLastIdealStyleValue;
              newLastIdealVelocity[key] = newLastIdealVelocityValue;
            }
          }

          newCurrentStyles[i] = newCurrentStyle;
          newCurrentVelocities[i] = newCurrentVelocity;
          newLastIdealStyles[i] = newLastIdealStyle;
          newLastIdealVelocities[i] = newLastIdealVelocity;
        }

        _this.animationID = null;
        // the amount we're looped over above
        _this.accumulatedTime -= framesToCatchUp * msPerFrame;

        _this.setState({
          currentStyles: newCurrentStyles,
          currentVelocities: newCurrentVelocities,
          lastIdealStyles: newLastIdealStyles,
          lastIdealVelocities: newLastIdealVelocities
        });

        _this.unreadPropStyles = null;

        _this.startAnimationIfNecessary();
      });
    };

    this.state = this.defaultState();
  }

  StaggeredMotion.prototype.defaultState = function defaultState() {
    var _props = this.props;
    var defaultStyles = _props.defaultStyles;
    var styles = _props.styles;

    var currentStyles = defaultStyles || styles().map(_stripStyle2['default']);
    var currentVelocities = currentStyles.map(function (currentStyle) {
      return _mapToZero2['default'](currentStyle);
    });
    return {
      currentStyles: currentStyles,
      currentVelocities: currentVelocities,
      lastIdealStyles: currentStyles,
      lastIdealVelocities: currentVelocities
    };
  };

  StaggeredMotion.prototype.componentDidMount = function componentDidMount() {
    this.prevTime = _performanceNow2['default']();
    this.startAnimationIfNecessary();
  };

  StaggeredMotion.prototype.componentWillReceiveProps = function componentWillReceiveProps(props) {
    if (this.unreadPropStyles != null) {
      // previous props haven't had the chance to be set yet; set them here
      this.clearUnreadPropStyle(this.unreadPropStyles);
    }

    this.unreadPropStyles = props.styles(this.state.lastIdealStyles);
    if (this.animationID == null) {
      this.prevTime = _performanceNow2['default']();
      this.startAnimationIfNecessary();
    }
  };

  StaggeredMotion.prototype.componentWillUnmount = function componentWillUnmount() {
    if (this.animationID != null) {
      _raf2['default'].cancel(this.animationID);
      this.animationID = null;
    }
  };

  StaggeredMotion.prototype.render = function render() {
    var renderedChildren = this.props.children(this.state.currentStyles);
    return renderedChildren && _react2['default'].Children.only(renderedChildren);
  };

  return StaggeredMotion;
})(_react2['default'].Component);

exports['default'] = StaggeredMotion;
module.exports = exports['default'];

// it's possible that currentStyle's value is stale: if props is immediately
// changed from 0 to 400 to spring(0) again, the async currentStyle is still
// at 0 (didn't have time to tick and interpolate even once). If we naively
// compare currentStyle with destVal it'll be 0 === 0 (no animation, stop).
// In reality currentStyle should be 400

// after checking for unreadPropStyles != null, we manually go set the
// non-interpolating values (those that are a number, without a spring
// config)
});

unwrapExports(StaggeredMotion_1);

var mergeDiff_1 = createCommonjsModule(function (module, exports) {
// core keys merging algorithm. If previous render's keys are [a, b], and the
// next render's [c, b, d], what's the final merged keys and ordering?

// - c and a must both be before b
// - b before d
// - ordering between a and c ambiguous

// this reduces to merging two partially ordered lists (e.g. lists where not
// every item has a definite ordering, like comparing a and c above). For the
// ambiguous ordering we deterministically choose to place the next render's
// item after the previous'; so c after a

// this is called a topological sorting. Except the existing algorithms don't
// work well with js bc of the amount of allocation, and isn't optimized for our
// current use-case bc the runtime is linear in terms of edges (see wiki for
// meaning), which is huge when two lists have many common elements
exports.__esModule = true;
exports['default'] = mergeDiff;

function mergeDiff(prev, next, onRemove) {
  // bookkeeping for easier access of a key's index below. This is 2 allocations +
  // potentially triggering chrome hash map mode for objs (so it might be faster

  var prevKeyIndex = {};
  for (var i = 0; i < prev.length; i++) {
    prevKeyIndex[prev[i].key] = i;
  }
  var nextKeyIndex = {};
  for (var i = 0; i < next.length; i++) {
    nextKeyIndex[next[i].key] = i;
  }

  // first, an overly elaborate way of merging prev and next, eliminating
  // duplicates (in terms of keys). If there's dupe, keep the item in next).
  // This way of writing it saves allocations
  var ret = [];
  for (var i = 0; i < next.length; i++) {
    ret[i] = next[i];
  }
  for (var i = 0; i < prev.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(nextKeyIndex, prev[i].key)) {
      // this is called my TM's `mergeAndSync`, which calls willLeave. We don't
      // merge in keys that the user desires to kill
      var fill = onRemove(i, prev[i]);
      if (fill != null) {
        ret.push(fill);
      }
    }
  }

  // now all the items all present. Core sorting logic to have the right order
  return ret.sort(function (a, b) {
    var nextOrderA = nextKeyIndex[a.key];
    var nextOrderB = nextKeyIndex[b.key];
    var prevOrderA = prevKeyIndex[a.key];
    var prevOrderB = prevKeyIndex[b.key];

    if (nextOrderA != null && nextOrderB != null) {
      // both keys in next
      return nextKeyIndex[a.key] - nextKeyIndex[b.key];
    } else if (prevOrderA != null && prevOrderB != null) {
      // both keys in prev
      return prevKeyIndex[a.key] - prevKeyIndex[b.key];
    } else if (nextOrderA != null) {
      // key a in next, key b in prev

      // how to determine the order between a and b? We find a "pivot" (term
      // abuse), a key present in both prev and next, that is sandwiched between
      // a and b. In the context of our above example, if we're comparing a and
      // d, b's (the only) pivot
      for (var i = 0; i < next.length; i++) {
        var pivot = next[i].key;
        if (!Object.prototype.hasOwnProperty.call(prevKeyIndex, pivot)) {
          continue;
        }

        if (nextOrderA < nextKeyIndex[pivot] && prevOrderB > prevKeyIndex[pivot]) {
          return -1;
        } else if (nextOrderA > nextKeyIndex[pivot] && prevOrderB < prevKeyIndex[pivot]) {
          return 1;
        }
      }
      // pluggable. default to: next bigger than prev
      return 1;
    }
    // prevOrderA, nextOrderB
    for (var i = 0; i < next.length; i++) {
      var pivot = next[i].key;
      if (!Object.prototype.hasOwnProperty.call(prevKeyIndex, pivot)) {
        continue;
      }
      if (nextOrderB < nextKeyIndex[pivot] && prevOrderA > prevKeyIndex[pivot]) {
        return 1;
      } else if (nextOrderB > nextKeyIndex[pivot] && prevOrderA < prevKeyIndex[pivot]) {
        return -1;
      }
    }
    // pluggable. default to: next bigger than prev
    return -1;
  });
}

module.exports = exports['default'];
// to loop through and find a key's index each time), but I no longer care
});

unwrapExports(mergeDiff_1);

var TransitionMotion_1 = createCommonjsModule(function (module, exports) {
exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }



var _mapToZero2 = _interopRequireDefault(mapToZero_1);



var _stripStyle2 = _interopRequireDefault(stripStyle_1);



var _stepper4 = _interopRequireDefault(stepper_1);



var _mergeDiff2 = _interopRequireDefault(mergeDiff_1);



var _performanceNow2 = _interopRequireDefault(performanceNow);



var _raf2 = _interopRequireDefault(raf_1);



var _shouldStopAnimation2 = _interopRequireDefault(shouldStopAnimation_1);



var _react2 = _interopRequireDefault(React);



var _propTypes2 = _interopRequireDefault(propTypes);

var msPerFrame = 1000 / 60;

// the children function & (potential) styles function asks as param an
// Array<TransitionPlainStyle>, where each TransitionPlainStyle is of the format
// {key: string, data?: any, style: PlainStyle}. However, the way we keep
// internal states doesn't contain such a data structure (check the state and
// TransitionMotionState). So when children function and others ask for such
// data we need to generate them on the fly by combining mergedPropsStyles and
// currentStyles/lastIdealStyles
function rehydrateStyles(mergedPropsStyles, unreadPropStyles, plainStyles) {
  // Copy the value to a `const` so that Flow understands that the const won't
  // change and will be non-nullable in the callback below.
  var cUnreadPropStyles = unreadPropStyles;
  if (cUnreadPropStyles == null) {
    return mergedPropsStyles.map(function (mergedPropsStyle, i) {
      return {
        key: mergedPropsStyle.key,
        data: mergedPropsStyle.data,
        style: plainStyles[i]
      };
    });
  }
  return mergedPropsStyles.map(function (mergedPropsStyle, i) {
    for (var j = 0; j < cUnreadPropStyles.length; j++) {
      if (cUnreadPropStyles[j].key === mergedPropsStyle.key) {
        return {
          key: cUnreadPropStyles[j].key,
          data: cUnreadPropStyles[j].data,
          style: plainStyles[i]
        };
      }
    }
    return { key: mergedPropsStyle.key, data: mergedPropsStyle.data, style: plainStyles[i] };
  });
}

function shouldStopAnimationAll(currentStyles, destStyles, currentVelocities, mergedPropsStyles) {
  if (mergedPropsStyles.length !== destStyles.length) {
    return false;
  }

  for (var i = 0; i < mergedPropsStyles.length; i++) {
    if (mergedPropsStyles[i].key !== destStyles[i].key) {
      return false;
    }
  }

  // we have the invariant that mergedPropsStyles and
  // currentStyles/currentVelocities/last* are synced in terms of cells, see
  // mergeAndSync comment for more info
  for (var i = 0; i < mergedPropsStyles.length; i++) {
    if (!_shouldStopAnimation2['default'](currentStyles[i], destStyles[i].style, currentVelocities[i])) {
      return false;
    }
  }

  return true;
}

// core key merging logic

// things to do: say previously merged style is {a, b}, dest style (prop) is {b,
// c}, previous current (interpolating) style is {a, b}
// **invariant**: current[i] corresponds to merged[i] in terms of key

// steps:
// turn merged style into {a?, b, c}
//    add c, value of c is destStyles.c
//    maybe remove a, aka call willLeave(a), then merged is either {b, c} or {a, b, c}
// turn current (interpolating) style from {a, b} into {a?, b, c}
//    maybe remove a
//    certainly add c, value of c is willEnter(c)
// loop over merged and construct new current
// dest doesn't change, that's owner's
function mergeAndSync(willEnter, willLeave, didLeave, oldMergedPropsStyles, destStyles, oldCurrentStyles, oldCurrentVelocities, oldLastIdealStyles, oldLastIdealVelocities) {
  var newMergedPropsStyles = _mergeDiff2['default'](oldMergedPropsStyles, destStyles, function (oldIndex, oldMergedPropsStyle) {
    var leavingStyle = willLeave(oldMergedPropsStyle);
    if (leavingStyle == null) {
      didLeave({ key: oldMergedPropsStyle.key, data: oldMergedPropsStyle.data });
      return null;
    }
    if (_shouldStopAnimation2['default'](oldCurrentStyles[oldIndex], leavingStyle, oldCurrentVelocities[oldIndex])) {
      didLeave({ key: oldMergedPropsStyle.key, data: oldMergedPropsStyle.data });
      return null;
    }
    return { key: oldMergedPropsStyle.key, data: oldMergedPropsStyle.data, style: leavingStyle };
  });

  var newCurrentStyles = [];
  var newCurrentVelocities = [];
  var newLastIdealStyles = [];
  var newLastIdealVelocities = [];
  for (var i = 0; i < newMergedPropsStyles.length; i++) {
    var newMergedPropsStyleCell = newMergedPropsStyles[i];
    var foundOldIndex = null;
    for (var j = 0; j < oldMergedPropsStyles.length; j++) {
      if (oldMergedPropsStyles[j].key === newMergedPropsStyleCell.key) {
        foundOldIndex = j;
        break;
      }
    }
    // TODO: key search code
    if (foundOldIndex == null) {
      var plainStyle = willEnter(newMergedPropsStyleCell);
      newCurrentStyles[i] = plainStyle;
      newLastIdealStyles[i] = plainStyle;

      var velocity = _mapToZero2['default'](newMergedPropsStyleCell.style);
      newCurrentVelocities[i] = velocity;
      newLastIdealVelocities[i] = velocity;
    } else {
      newCurrentStyles[i] = oldCurrentStyles[foundOldIndex];
      newLastIdealStyles[i] = oldLastIdealStyles[foundOldIndex];
      newCurrentVelocities[i] = oldCurrentVelocities[foundOldIndex];
      newLastIdealVelocities[i] = oldLastIdealVelocities[foundOldIndex];
    }
  }

  return [newMergedPropsStyles, newCurrentStyles, newCurrentVelocities, newLastIdealStyles, newLastIdealVelocities];
}

var TransitionMotion = (function (_React$Component) {
  _inherits(TransitionMotion, _React$Component);

  _createClass(TransitionMotion, null, [{
    key: 'propTypes',
    value: {
      defaultStyles: _propTypes2['default'].arrayOf(_propTypes2['default'].shape({
        key: _propTypes2['default'].string.isRequired,
        data: _propTypes2['default'].any,
        style: _propTypes2['default'].objectOf(_propTypes2['default'].number).isRequired
      })),
      styles: _propTypes2['default'].oneOfType([_propTypes2['default'].func, _propTypes2['default'].arrayOf(_propTypes2['default'].shape({
        key: _propTypes2['default'].string.isRequired,
        data: _propTypes2['default'].any,
        style: _propTypes2['default'].objectOf(_propTypes2['default'].oneOfType([_propTypes2['default'].number, _propTypes2['default'].object])).isRequired
      }))]).isRequired,
      children: _propTypes2['default'].func.isRequired,
      willEnter: _propTypes2['default'].func,
      willLeave: _propTypes2['default'].func,
      didLeave: _propTypes2['default'].func
    },
    enumerable: true
  }, {
    key: 'defaultProps',
    value: {
      willEnter: function willEnter(styleThatEntered) {
        return _stripStyle2['default'](styleThatEntered.style);
      },
      // recall: returning null makes the current unmounting TransitionStyle
      // disappear immediately
      willLeave: function willLeave() {
        return null;
      },
      didLeave: function didLeave() {}
    },
    enumerable: true
  }]);

  function TransitionMotion(props) {
    var _this = this;

    _classCallCheck(this, TransitionMotion);

    _React$Component.call(this, props);
    this.unmounting = false;
    this.animationID = null;
    this.prevTime = 0;
    this.accumulatedTime = 0;
    this.unreadPropStyles = null;

    this.clearUnreadPropStyle = function (unreadPropStyles) {
      var _mergeAndSync = mergeAndSync(_this.props.willEnter, _this.props.willLeave, _this.props.didLeave, _this.state.mergedPropsStyles, unreadPropStyles, _this.state.currentStyles, _this.state.currentVelocities, _this.state.lastIdealStyles, _this.state.lastIdealVelocities);

      var mergedPropsStyles = _mergeAndSync[0];
      var currentStyles = _mergeAndSync[1];
      var currentVelocities = _mergeAndSync[2];
      var lastIdealStyles = _mergeAndSync[3];
      var lastIdealVelocities = _mergeAndSync[4];

      for (var i = 0; i < unreadPropStyles.length; i++) {
        var unreadPropStyle = unreadPropStyles[i].style;
        var dirty = false;

        for (var key in unreadPropStyle) {
          if (!Object.prototype.hasOwnProperty.call(unreadPropStyle, key)) {
            continue;
          }

          var styleValue = unreadPropStyle[key];
          if (typeof styleValue === 'number') {
            if (!dirty) {
              dirty = true;
              currentStyles[i] = _extends({}, currentStyles[i]);
              currentVelocities[i] = _extends({}, currentVelocities[i]);
              lastIdealStyles[i] = _extends({}, lastIdealStyles[i]);
              lastIdealVelocities[i] = _extends({}, lastIdealVelocities[i]);
              mergedPropsStyles[i] = {
                key: mergedPropsStyles[i].key,
                data: mergedPropsStyles[i].data,
                style: _extends({}, mergedPropsStyles[i].style)
              };
            }
            currentStyles[i][key] = styleValue;
            currentVelocities[i][key] = 0;
            lastIdealStyles[i][key] = styleValue;
            lastIdealVelocities[i][key] = 0;
            mergedPropsStyles[i].style[key] = styleValue;
          }
        }
      }

      // unlike the other 2 components, we can't detect staleness and optionally
      // opt out of setState here. each style object's data might contain new
      // stuff we're not/cannot compare
      _this.setState({
        currentStyles: currentStyles,
        currentVelocities: currentVelocities,
        mergedPropsStyles: mergedPropsStyles,
        lastIdealStyles: lastIdealStyles,
        lastIdealVelocities: lastIdealVelocities
      });
    };

    this.startAnimationIfNecessary = function () {
      if (_this.unmounting) {
        return;
      }

      // TODO: when config is {a: 10} and dest is {a: 10} do we raf once and
      // call cb? No, otherwise accidental parent rerender causes cb trigger
      _this.animationID = _raf2['default'](function (timestamp) {
        // https://github.com/chenglou/react-motion/pull/420
        // > if execution passes the conditional if (this.unmounting), then
        // executes async defaultRaf and after that component unmounts and after
        // that the callback of defaultRaf is called, then setState will be called
        // on unmounted component.
        if (_this.unmounting) {
          return;
        }

        var propStyles = _this.props.styles;
        var destStyles = typeof propStyles === 'function' ? propStyles(rehydrateStyles(_this.state.mergedPropsStyles, _this.unreadPropStyles, _this.state.lastIdealStyles)) : propStyles;

        // check if we need to animate in the first place
        if (shouldStopAnimationAll(_this.state.currentStyles, destStyles, _this.state.currentVelocities, _this.state.mergedPropsStyles)) {
          // no need to cancel animationID here; shouldn't have any in flight
          _this.animationID = null;
          _this.accumulatedTime = 0;
          return;
        }

        var currentTime = timestamp || _performanceNow2['default']();
        var timeDelta = currentTime - _this.prevTime;
        _this.prevTime = currentTime;
        _this.accumulatedTime = _this.accumulatedTime + timeDelta;
        // more than 10 frames? prolly switched browser tab. Restart
        if (_this.accumulatedTime > msPerFrame * 10) {
          _this.accumulatedTime = 0;
        }

        if (_this.accumulatedTime === 0) {
          // no need to cancel animationID here; shouldn't have any in flight
          _this.animationID = null;
          _this.startAnimationIfNecessary();
          return;
        }

        var currentFrameCompletion = (_this.accumulatedTime - Math.floor(_this.accumulatedTime / msPerFrame) * msPerFrame) / msPerFrame;
        var framesToCatchUp = Math.floor(_this.accumulatedTime / msPerFrame);

        var _mergeAndSync2 = mergeAndSync(_this.props.willEnter, _this.props.willLeave, _this.props.didLeave, _this.state.mergedPropsStyles, destStyles, _this.state.currentStyles, _this.state.currentVelocities, _this.state.lastIdealStyles, _this.state.lastIdealVelocities);

        var newMergedPropsStyles = _mergeAndSync2[0];
        var newCurrentStyles = _mergeAndSync2[1];
        var newCurrentVelocities = _mergeAndSync2[2];
        var newLastIdealStyles = _mergeAndSync2[3];
        var newLastIdealVelocities = _mergeAndSync2[4];

        for (var i = 0; i < newMergedPropsStyles.length; i++) {
          var newMergedPropsStyle = newMergedPropsStyles[i].style;
          var newCurrentStyle = {};
          var newCurrentVelocity = {};
          var newLastIdealStyle = {};
          var newLastIdealVelocity = {};

          for (var key in newMergedPropsStyle) {
            if (!Object.prototype.hasOwnProperty.call(newMergedPropsStyle, key)) {
              continue;
            }

            var styleValue = newMergedPropsStyle[key];
            if (typeof styleValue === 'number') {
              newCurrentStyle[key] = styleValue;
              newCurrentVelocity[key] = 0;
              newLastIdealStyle[key] = styleValue;
              newLastIdealVelocity[key] = 0;
            } else {
              var newLastIdealStyleValue = newLastIdealStyles[i][key];
              var newLastIdealVelocityValue = newLastIdealVelocities[i][key];
              for (var j = 0; j < framesToCatchUp; j++) {
                var _stepper = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

                newLastIdealStyleValue = _stepper[0];
                newLastIdealVelocityValue = _stepper[1];
              }

              var _stepper2 = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

              var nextIdealX = _stepper2[0];
              var nextIdealV = _stepper2[1];

              newCurrentStyle[key] = newLastIdealStyleValue + (nextIdealX - newLastIdealStyleValue) * currentFrameCompletion;
              newCurrentVelocity[key] = newLastIdealVelocityValue + (nextIdealV - newLastIdealVelocityValue) * currentFrameCompletion;
              newLastIdealStyle[key] = newLastIdealStyleValue;
              newLastIdealVelocity[key] = newLastIdealVelocityValue;
            }
          }

          newLastIdealStyles[i] = newLastIdealStyle;
          newLastIdealVelocities[i] = newLastIdealVelocity;
          newCurrentStyles[i] = newCurrentStyle;
          newCurrentVelocities[i] = newCurrentVelocity;
        }

        _this.animationID = null;
        // the amount we're looped over above
        _this.accumulatedTime -= framesToCatchUp * msPerFrame;

        _this.setState({
          currentStyles: newCurrentStyles,
          currentVelocities: newCurrentVelocities,
          lastIdealStyles: newLastIdealStyles,
          lastIdealVelocities: newLastIdealVelocities,
          mergedPropsStyles: newMergedPropsStyles
        });

        _this.unreadPropStyles = null;

        _this.startAnimationIfNecessary();
      });
    };

    this.state = this.defaultState();
  }

  TransitionMotion.prototype.defaultState = function defaultState() {
    var _props = this.props;
    var defaultStyles = _props.defaultStyles;
    var styles = _props.styles;
    var willEnter = _props.willEnter;
    var willLeave = _props.willLeave;
    var didLeave = _props.didLeave;

    var destStyles = typeof styles === 'function' ? styles(defaultStyles) : styles;

    // this is special. for the first time around, we don't have a comparison
    // between last (no last) and current merged props. we'll compute last so:
    // say default is {a, b} and styles (dest style) is {b, c}, we'll
    // fabricate last as {a, b}
    var oldMergedPropsStyles = undefined;
    if (defaultStyles == null) {
      oldMergedPropsStyles = destStyles;
    } else {
      oldMergedPropsStyles = defaultStyles.map(function (defaultStyleCell) {
        // TODO: key search code
        for (var i = 0; i < destStyles.length; i++) {
          if (destStyles[i].key === defaultStyleCell.key) {
            return destStyles[i];
          }
        }
        return defaultStyleCell;
      });
    }
    var oldCurrentStyles = defaultStyles == null ? destStyles.map(function (s) {
      return _stripStyle2['default'](s.style);
    }) : defaultStyles.map(function (s) {
      return _stripStyle2['default'](s.style);
    });
    var oldCurrentVelocities = defaultStyles == null ? destStyles.map(function (s) {
      return _mapToZero2['default'](s.style);
    }) : defaultStyles.map(function (s) {
      return _mapToZero2['default'](s.style);
    });

    var _mergeAndSync3 = mergeAndSync(
    // Because this is an old-style createReactClass component, Flow doesn't
    // understand that the willEnter and willLeave props have default values
    // and will always be present.
    willEnter, willLeave, didLeave, oldMergedPropsStyles, destStyles, oldCurrentStyles, oldCurrentVelocities, oldCurrentStyles, // oldLastIdealStyles really
    oldCurrentVelocities);

    var mergedPropsStyles = _mergeAndSync3[0];
    var currentStyles = _mergeAndSync3[1];
    var currentVelocities = _mergeAndSync3[2];
    var lastIdealStyles = _mergeAndSync3[3];
    var lastIdealVelocities = _mergeAndSync3[4];
    // oldLastIdealVelocities really

    return {
      currentStyles: currentStyles,
      currentVelocities: currentVelocities,
      lastIdealStyles: lastIdealStyles,
      lastIdealVelocities: lastIdealVelocities,
      mergedPropsStyles: mergedPropsStyles
    };
  };

  // after checking for unreadPropStyles != null, we manually go set the
  // non-interpolating values (those that are a number, without a spring
  // config)

  TransitionMotion.prototype.componentDidMount = function componentDidMount() {
    this.prevTime = _performanceNow2['default']();
    this.startAnimationIfNecessary();
  };

  TransitionMotion.prototype.componentWillReceiveProps = function componentWillReceiveProps(props) {
    if (this.unreadPropStyles) {
      // previous props haven't had the chance to be set yet; set them here
      this.clearUnreadPropStyle(this.unreadPropStyles);
    }

    var styles = props.styles;
    if (typeof styles === 'function') {
      this.unreadPropStyles = styles(rehydrateStyles(this.state.mergedPropsStyles, this.unreadPropStyles, this.state.lastIdealStyles));
    } else {
      this.unreadPropStyles = styles;
    }

    if (this.animationID == null) {
      this.prevTime = _performanceNow2['default']();
      this.startAnimationIfNecessary();
    }
  };

  TransitionMotion.prototype.componentWillUnmount = function componentWillUnmount() {
    this.unmounting = true;
    if (this.animationID != null) {
      _raf2['default'].cancel(this.animationID);
      this.animationID = null;
    }
  };

  TransitionMotion.prototype.render = function render() {
    var hydratedStyles = rehydrateStyles(this.state.mergedPropsStyles, this.unreadPropStyles, this.state.currentStyles);
    var renderedChildren = this.props.children(hydratedStyles);
    return renderedChildren && _react2['default'].Children.only(renderedChildren);
  };

  return TransitionMotion;
})(_react2['default'].Component);

exports['default'] = TransitionMotion;
module.exports = exports['default'];

// list of styles, each containing interpolating values. Part of what's passed
// to children function. Notice that this is
// Array<ActualInterpolatingStyleObject>, without the wrapper that is {key: ...,
// data: ... style: ActualInterpolatingStyleObject}. Only mergedPropsStyles
// contains the key & data info (so that we only have a single source of truth
// for these, and to save space). Check the comment for `rehydrateStyles` to
// see how we regenerate the entirety of what's passed to children function

// the array that keeps track of currently rendered stuff! Including stuff
// that you've unmounted but that's still animating. This is where it lives

// it's possible that currentStyle's value is stale: if props is immediately
// changed from 0 to 400 to spring(0) again, the async currentStyle is still
// at 0 (didn't have time to tick and interpolate even once). If we naively
// compare currentStyle with destVal it'll be 0 === 0 (no animation, stop).
// In reality currentStyle should be 400
});

unwrapExports(TransitionMotion_1);

var presets = createCommonjsModule(function (module, exports) {
exports.__esModule = true;
exports["default"] = {
  noWobble: { stiffness: 170, damping: 26 }, // the default, if nothing provided
  gentle: { stiffness: 120, damping: 14 },
  wobbly: { stiffness: 180, damping: 12 },
  stiff: { stiffness: 210, damping: 20 }
};
module.exports = exports["default"];
});

unwrapExports(presets);

var spring_1 = createCommonjsModule(function (module, exports) {
exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports['default'] = spring;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }



var _presets2 = _interopRequireDefault(presets);

var defaultConfig = _extends({}, _presets2['default'].noWobble, {
  precision: 0.01
});

function spring(val, config) {
  return _extends({}, defaultConfig, config, { val: val });
}

module.exports = exports['default'];
});

unwrapExports(spring_1);

var reorderKeys_1 = createCommonjsModule(function (module, exports) {
exports.__esModule = true;
exports['default'] = reorderKeys;

var hasWarned = false;

function reorderKeys() {
  if (process.env.NODE_ENV === 'development') {
    if (!hasWarned) {
      hasWarned = true;
      console.error('`reorderKeys` has been removed, since it is no longer needed for TransitionMotion\'s new styles array API.');
    }
  }
}

module.exports = exports['default'];
});

unwrapExports(reorderKeys_1);

var reactMotion = createCommonjsModule(function (module, exports) {
exports.__esModule = true;

function _interopRequire(obj) { return obj && obj.__esModule ? obj['default'] : obj; }



exports.Motion = _interopRequire(Motion_1);



exports.StaggeredMotion = _interopRequire(StaggeredMotion_1);



exports.TransitionMotion = _interopRequire(TransitionMotion_1);



exports.spring = _interopRequire(spring_1);



exports.presets = _interopRequire(presets);



exports.stripStyle = _interopRequire(stripStyle_1);

// deprecated, dummy warning function



exports.reorderKeys = _interopRequire(reorderKeys_1);
});

unwrapExports(reactMotion);
var reactMotion_1 = reactMotion.Motion;
var reactMotion_2 = reactMotion.StaggeredMotion;
var reactMotion_3 = reactMotion.TransitionMotion;
var reactMotion_4 = reactMotion.spring;
var reactMotion_5 = reactMotion.presets;
var reactMotion_6 = reactMotion.stripStyle;
var reactMotion_7 = reactMotion.reorderKeys;

var BORDER_WIDTH = 4;

var VALUE_DEFAULT = 1;
var SIZE_DEFAULT = 80;
var LABEL_DEFAULT = function LABEL_DEFAULT(value) {
  return Math.round(value * 100) + '%';
};

var CircleGraph = function CircleGraph(_ref) {
  var value = _ref.value,
      label = _ref.label,
      size = _ref.size;

  var length = Math.PI * 2 * (size - BORDER_WIDTH);
  var radius = (size - BORDER_WIDTH) / 2;
  return React.createElement(
    reactMotion_1,
    {
      defaultStyle: { progressValue: 0 },
      style: { progressValue: reactMotion_4(value, spring('slow')) }
    },
    function (_ref2) {
      var progressValue = _ref2.progressValue;
      return React.createElement(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 ' + size + ' ' + size,
          xmlns: 'http://www.w3.org/2000/svg'
        },
        React.createElement(CircleBase, { cx: size / 2, cy: size / 2, r: radius }),
        React.createElement(CircleValue, {
          cx: size / 2,
          cy: size / 2,
          r: radius,
          style: {
            strokeDasharray: length,
            strokeDashoffset: length - length * progressValue / 2,
            strokeWidth: BORDER_WIDTH
          }
        }),
        React.createElement(
          Label,
          { x: '50%', y: '50%' },
          label(Math.min(value, Math.max(0, progressValue)))
        )
      );
    }
  );
};

CircleGraph.defaultProps = {
  value: VALUE_DEFAULT,
  size: SIZE_DEFAULT,
  label: LABEL_DEFAULT
};

var CircleBase = styled.circle.withConfig({
  displayName: 'CircleGraph__CircleBase'
})(['fill:none;stroke:#6d777b;opacity:0.3;']);

var CircleValue = styled.circle.withConfig({
  displayName: 'CircleGraph__CircleValue'
})(['fill:none;transform:rotate(270deg);transform-origin:50% 50%;stroke:#21c1e7;']);

var Label = styled.text.withConfig({
  displayName: 'CircleGraph__Label'
})(['fill:#000;font-size:16px;font-weight:600;dominant-baseline:middle;alignment-baseline:middle;text-anchor:middle;']);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }




var ClickOutComponent = function (_React$Component) {
  _inherits(ClickOutComponent, _React$Component);

  function ClickOutComponent() {
    _classCallCheck(this, ClickOutComponent);

    return _possibleConstructorReturn(this, (ClickOutComponent.__proto__ || Object.getPrototypeOf(ClickOutComponent)).call(this));
  }

  _createClass(ClickOutComponent, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var self = this;
      var elTouchIsClick = true;
      var documentTouchIsClick = true;
      var el = reactDom.findDOMNode(this);

      self.__documentTouchStarted = function (e) {
        el.removeEventListener('click', self.__elementClicked);
        document.removeEventListener('click', self.__documentClicked);
      };

      self.__documentTouchMoved = function (e) {
        documentTouchIsClick = false;
      };

      self.__documentTouchEnded = function (e) {
        if (documentTouchIsClick) self.__documentClicked(e);
        documentTouchIsClick = true;
      };

      self.__documentClicked = function (e) {
        if ((e.__clickedElements || []).indexOf(el) !== -1) return;

        var clickOutHandler = self.onClickOut || self.props.onClickOut;
        if (!clickOutHandler) {
          return console.warn('onClickOut is not defined.');
        }

        clickOutHandler.call(self, e);
      };

      self.__elementTouchMoved = function (e) {
        elTouchIsClick = false;
      };

      self.__elementTouchEnded = function (e) {
        if (elTouchIsClick) self.__elementClicked(e);
        elTouchIsClick = true;
      };

      self.__elementClicked = function (e) {
        e.__clickedElements = e.__clickedElements || [];
        e.__clickedElements.push(el);
      };

      setTimeout(function () {
        if (self.__unmounted) return;
        self.toggleListeners('addEventListener');
      }, 0);
    }
  }, {
    key: 'toggleListeners',
    value: function toggleListeners(listenerMethod) {
      var el = reactDom.findDOMNode(this);

      el[listenerMethod]('touchmove', this.__elementTouchMoved);
      el[listenerMethod]('touchend', this.__elementTouchEnded);
      el[listenerMethod]('click', this.__elementClicked);

      document[listenerMethod]('touchstart', this.__documentTouchStarted);
      document[listenerMethod]('touchmove', this.__documentTouchMoved);
      document[listenerMethod]('touchend', this.__documentTouchEnded);
      document[listenerMethod]('click', this.__documentClicked);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.toggleListeners('removeEventListener');
      this.__unmounted = true;
    }
  }, {
    key: 'render',
    value: function render() {
      return Array.isArray(this.props.children) ? React.createElement(
        'div',
        null,
        this.props.children
      ) : React.Children.only(this.props.children);
    }
  }]);

  return ClickOutComponent;
}(React.Component);

var reactOnclickout = ClickOutComponent;

var Ellipsis = function Ellipsis(props) {
  return React.createElement(
    "svg",
    _extends({ width: 15, height: 4, viewBox: "0 0 15 4" }, props),
    React.createElement("path", {
      d: "M7.5 3.213a1.42 1.42 0 0 1-.974-.37c-.278-.248-.418-.588-.418-1.021 0-.384.135-.71.404-.979S7.11.439 7.5.439s.722.135.997.404c.276.27.413.595.413.979 0 .439-.142.78-.427 1.025a1.465 1.465 0 0 1-.983.366zm-5.327 0c-.371 0-.694-.122-.97-.366C.928 2.603.791 2.26.791 1.822c0-.39.133-.718.398-.984.266-.266.594-.399.984-.399s.722.135.997.404c.275.27.413.595.413.979 0 .439-.142.78-.427 1.025a1.465 1.465 0 0 1-.983.366zm10.654 0c-.365 0-.688-.123-.97-.37-.28-.248-.421-.588-.421-1.021 0-.384.134-.71.403-.979.27-.269.598-.404.988-.404s.722.135.997.404c.276.27.413.595.413.979 0 .433-.14.773-.422 1.02a1.45 1.45 0 0 1-.988.371z",
      fill: "currentColor",
      fillRule: "evenodd"
    })
  );
};

var ArrowDown = function ArrowDown(props) {
  return React.createElement(
    "svg",
    _extends({ width: 9, height: 5, viewBox: "0 0 9 5" }, props),
    React.createElement("path", { d: "M0 0h8.36L4.18 4.18z", fill: "currentColor", fillRule: "evenodd" })
  );
};

var BASE_WIDTH = 46;
var BASE_HEIGHT = 32;

var ContextMenu = function (_React$Component) {
  inherits(ContextMenu, _React$Component);

  function ContextMenu() {
    var _ref;

    var _temp, _this, _ret;

    classCallCheck(this, ContextMenu);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = ContextMenu.__proto__ || Object.getPrototypeOf(ContextMenu)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      opened: false
    }, _this.handleClose = function () {
      _this.setState({ opened: false });
    }, _this.handleBaseButtonClick = function () {
      _this.setState(function (_ref2) {
        var opened = _ref2.opened;
        return { opened: !opened };
      });
    }, _temp), possibleConstructorReturn(_this, _ret);
  }

  createClass(ContextMenu, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var opened = this.state.opened;
      var children = this.props.children;

      return React.createElement(
        reactOnclickout,
        { onClickOut: this.handleClose },
        React.createElement(
          reactMotion_1,
          {
            style: {
              openProgress: reactMotion_4(Number(opened), spring('fast'))
            }
          },
          function (_ref3) {
            var openProgress = _ref3.openProgress;
            return React.createElement(
              Main,
              {
                opened: opened,
                style: {
                  boxShadow: '0 4px 4px rgba(0, 0, 0, ' + openProgress * 0.03 + ')'
                }
              },
              React.createElement(
                BaseButton,
                { onClick: _this2.handleBaseButtonClick, opened: opened },
                React.createElement(
                  'span',
                  null,
                  React.createElement(Ellipsis, {
                    style: {
                      color: opened ? theme.accent : theme.textSecondary
                    }
                  })
                ),
                React.createElement(
                  'span',
                  null,
                  React.createElement(ArrowDown, {
                    style: {
                      color: theme.textTertiary,
                      transform: 'rotate(' + openProgress * 180 + 'deg)'
                    }
                  })
                )
              ),
              React.createElement(
                Popup,
                {
                  opened: opened,
                  onClick: _this2.handleClose,
                  style: {
                    opacity: openProgress,
                    boxShadow: '0 4px 4px rgba(0, 0, 0, ' + openProgress * 0.03 + ')'
                  }
                },
                children
              )
            );
          }
        )
      );
    }
  }]);
  return ContextMenu;
}(React.Component);

var Main = styled.div.withConfig({
  displayName: 'ContextMenu__Main'
})(['position:relative;z-index:', ';width:', 'px;height:', 'px;'], function (_ref4) {
  var opened = _ref4.opened;
  return opened ? '2' : '1';
}, BASE_WIDTH, BASE_HEIGHT);

var BaseButton = styled.div.withConfig({
  displayName: 'ContextMenu__BaseButton'
})(['position:relative;z-index:2;display:flex;justify-content:center;align-items:center;width:100%;height:', 'px;background:', ';border:1px solid ', ';border-radius:', ';border-bottom-color:', ';cursor:pointer;', ';&:active{background:', ';border-bottom-color:', ';}&:before{display:', ';content:\'\';position:absolute;bottom:-1px;right:-1px;width:1px;height:2px;background:', ';}& > span{display:flex;align-items:center;&:first-child{margin-right:5px;}}'], BASE_HEIGHT, theme.contentBackground, theme.contentBorder, function (_ref5) {
  var opened = _ref5.opened;
  return opened ? '3px 3px 0 0' : '3px';
}, function (_ref6) {
  var opened = _ref6.opened;
  return opened ? theme.contentBackground : theme.contentBorder;
}, unselectable(), theme.contentBackgroundActive, function (_ref7) {
  var opened = _ref7.opened;
  return opened ? theme.contentBackgroundActive : theme.contentBorder;
}, function (_ref8) {
  var opened = _ref8.opened;
  return opened ? 'block' : 'none';
}, theme.contentBorder);

var Popup = styled.div.withConfig({
  displayName: 'ContextMenu__Popup'
})(['display:', ';overflow:hidden;position:absolute;top:', 'px;right:0;padding:10px 0;background:', ';border:1px solid ', ';border-radius:3px 0 3px 3px;'], function (_ref9) {
  var opened = _ref9.opened;
  return opened ? 'block' : 'none';
}, BASE_HEIGHT - 1, theme.contentBackground, theme.contentBorder);

ContextMenu.BASE_WIDTH = 46;
ContextMenu.BASE_HEIGHT = 32;

var ContextMenuItem = styled.div.withConfig({
  displayName: 'ContextMenuItem'
})(['display:flex;align-items:center;padding:5px 20px;cursor:pointer;white-space:nowrap;', ';&:active{background:', ';}'], unselectable(), theme.contentBackgroundActive);

var FRAME_EVERY = 1000 / 30; // 30 FPS is enough for a ticker

var formatUnit = function formatUnit(v) {
  return String(v).padStart(2, '0');
};

var Countdown = function Countdown(_ref) {
  var end = _ref.end;

  var _difference = difference(end, new Date()),
      days = _difference.days,
      hours = _difference.hours,
      minutes = _difference.minutes,
      seconds = _difference.seconds,
      totalInSeconds = _difference.totalInSeconds;

  return React.createElement(
    Main$1,
    { dateTime: formatHtmlDatetime(end) },
    React.createElement(
      IconWrapper,
      null,
      React.createElement(Time, null)
    ),
    totalInSeconds > 0 ? React.createElement(
      'span',
      null,
      React.createElement(
        Part,
        null,
        formatUnit(days),
        React.createElement(
          Unit,
          null,
          'D'
        )
      ),
      React.createElement(Separator, null),
      React.createElement(
        Part,
        null,
        formatUnit(hours),
        React.createElement(
          Unit,
          null,
          'H'
        )
      ),
      React.createElement(
        Separator,
        null,
        ':'
      ),
      React.createElement(
        Part,
        null,
        formatUnit(minutes),
        React.createElement(
          Unit,
          null,
          'M'
        )
      ),
      React.createElement(
        Separator,
        null,
        ':'
      ),
      React.createElement(
        Part,
        null,
        formatUnit(seconds),
        React.createElement(
          Unit,
          null,
          'S'
        )
      )
    ) : React.createElement(
      TimeOut,
      null,
      'Time out'
    )
  );
};
Countdown.propTypes = {
  end: propTypes.instanceOf(Date)
};

var Main$1 = styled.time.withConfig({
  displayName: 'Countdown__Main'
})(['width:12em;white-space:nowrap;', ';'], unselectable());

var IconWrapper = styled.span.withConfig({
  displayName: 'Countdown__IconWrapper'
})(['margin-right:15px;']);

var Part = styled.span.withConfig({
  displayName: 'Countdown__Part'
})(['font-size:15px;font-weight:600;color:', ';'], theme.textPrimary);

var Separator = styled.span.withConfig({
  displayName: 'Countdown__Separator'
})(['margin:0 4px;color:', ';font-weight:400;'], theme.textTertiary);

var Unit = styled.span.withConfig({
  displayName: 'Countdown__Unit'
})(['margin-left:2px;font-size:12px;color:', ';'], theme.textSecondary);

var TimeOut = styled.span.withConfig({
  displayName: 'Countdown__TimeOut'
})(['font-weight:600;color:', ';'], theme.textSecondary);

var Countdown$1 = redraw(FRAME_EVERY)(Countdown);

/**
 * Re-maps a number from one range to another.
 *
 * In the example above, the number '25' is converted from a value in the range
 * 0..100 into a value that ranges from the left edge (0) to the right edge
 * (width) of the screen. Numbers outside the range are not clamped to 0 and 1,
 * because out-of-range values are often intentional and useful.
 *
 * From Processing.js
 *
 * @param {Number} value        The incoming value to be converted
 * @param {Number} istart       Lower bound of the value's current range
 * @param {Number} istop        Upper bound of the value's current range
 * @param {Number} ostart       Lower bound of the value's target range
 * @param {Number} ostop        Upper bound of the value's target range
 * @returns {Number}
 */


/**
 * Normalizes a number from another range into a value between 0 and 1.
 *
 * Identical to map(value, low, high, 0, 1)
 * Numbers outside the range are not clamped to 0 and 1, because out-of-range
 * values are often intentional and useful.
 *
 * From Processing.js
 *
 * @param {Number} aNumber    The incoming value to be converted
 * @param {Number} low        Lower bound of the value's current range
 * @param {Number} high       Upper bound of the value's current range
 * @returns {Number}
 */


/**
 * Calculates a number between two numbers at a specific increment. The
 * progress parameter is the amount to interpolate between the two values where
 * 0.0 equal to the first point, 0.1 is very near the first point, 0.5 is
 * half-way in between, etc. The lerp function is convenient for creating
 * motion along a straight path and for drawing dotted lines.
 *
 * From Processing.js
 *
 * @param {Number} progress     between 0.0 and 1.0
 * @param {Number} value1       first value
 * @param {Number} value2       second value
 * @returns {Number}
 */
function lerp(progress, value1, value2) {
  return (value2 - value1) * progress + value1;
}

/**
 * Constrains a value to not exceed a maximum and minimum value.
 *
 * From Processing.js
 *
 * @param {Number} value   the value to constrain
 * @param {Number} value   minimum limit
 * @param {Number} value   maximum limit
 * @returns {Number}
 */


/**
 * Returns a random integer between min (included) and max (excluded)
 * Note: Using Math.round() would give a non-uniform distribution
 *
 * From Mozilla MDN
 *
 * @param {Number} min    The minimum number (included)
 * @param {Number} max    The maximum number (excluded)
 * @returns {Number}
 */


/**
 * Random number between two values.
 *
 * From Mozilla MDN
 *
 * @param {Number} min The minimum number (included)
 * @param {Number} max The maximum number (excluded)
 * @returns {Number}
 */

var NON_BREAKING_SPACE$1 = '\xa0';

var accent = theme.accent;
var contentBackgroundActive = theme.contentBackgroundActive;


var StyledDropDownItem = styled.div.attrs({ tabIndex: '0' }).withConfig({
  displayName: 'DropDownItem__StyledDropDownItem'
})(['position:relative;padding:8px 15px;cursor:pointer;outline:0;&:after{content:\'\';opacity:0;position:absolute;z-index:2;top:0;left:0;right:0;bottom:0;margin:-1px -2px;border:2px solid ', ';transition:all 100ms ease-in-out;}&:active{background-color:', ';}&:hover,&:focus{color:', ';}&:focus:after{opacity:', ';}'], accent, contentBackgroundActive, accent, function (_ref) {
  var displayFocus = _ref.displayFocus;
  return displayFocus ? 1 : 0;
});

var DropDownItem = function (_React$Component) {
  inherits(DropDownItem, _React$Component);

  function DropDownItem() {
    var _ref2;

    var _temp, _this, _ret;

    classCallCheck(this, DropDownItem);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref2 = DropDownItem.__proto__ || Object.getPrototypeOf(DropDownItem)).call.apply(_ref2, [this].concat(args))), _this), _this.state = {
      pressed: false,
      displayFocus: false
    }, _this.handleActivate = function (event) {
      var keyboard = event.type === 'keydown';
      if (keyboard && event.keyCode !== 13) {
        return;
      }
      _this.props.onActivate(_this.props.index, { keyboard: keyboard });
    }, _this.handleMouseDown = function () {
      _this.setState({ pressed: true });
    }, _this.handleMouseUp = function () {
      _this.setState({ pressed: false });
    }, _this.handleFocus = function () {
      _this.setState({ displayFocus: !_this.state.pressed });
    }, _temp), possibleConstructorReturn(_this, _ret);
  }

  createClass(DropDownItem, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          children = _props.children,
          className = _props.className,
          mainRef = _props.mainRef,
          active = _props.active;
      var displayFocus = this.state.displayFocus;

      return React.createElement(
        StyledDropDownItem,
        {
          innerRef: mainRef,
          className: className,
          active: active,
          displayFocus: displayFocus,
          onClick: this.handleActivate,
          onKeyDown: this.handleActivate,
          onMouseDown: this.handleMouseDown,
          onMouseUp: this.handleMouseUp,
          onFocus: this.handleFocus
        },
        children
      );
    }
  }]);
  return DropDownItem;
}(React.Component);

DropDownItem.defaultProps = {
  children: NON_BREAKING_SPACE$1,
  mainRef: function mainRef() {},
  className: ''
};

var arrow = "data:image/svg+xml,%3Csvg%20width%3D%229%22%20height%3D%225%22%20viewBox%3D%220%200%209%205%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h8.36L4.18%204.18z%22%20fill%3D%22%23B3B3B3%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E";

var NON_BREAKING_SPACE = '\xa0';

var contentBackground$1 = theme.contentBackground;
var contentBorder$1 = theme.contentBorder;
var textPrimary$1 = theme.textPrimary;


var StyledDropDown = styled.div.withConfig({
  displayName: 'DropDown__StyledDropDown'
})(['position:relative;z-index:', ';display:', ';flex-direction:column;color:', ';white-space:nowrap;box-shadow:0 4px 4px 0 rgba(0,0,0,0.03);', ';&:focus{outline:0;}'], function (_ref) {
  var opened = _ref.opened;
  return opened ? '2' : '0';
}, function (_ref2) {
  var wide = _ref2.wide;
  return wide ? 'flex' : 'inline-flex';
}, textPrimary$1, unselectable());

var DropDownItems = styled.div.withConfig({
  displayName: 'DropDown__DropDownItems'
})(['display:', ';min-width:', ';padding:8px 0;position:absolute;z-index:', ';top:calc(100% - 1px);color:', ';background:', ';border:1px solid ', ';box-shadow:0 4px 4px 0 rgba(0,0,0,0.06);border-radius:3px;list-style:none;'], function (_ref3) {
  var opened = _ref3.opened;
  return opened ? 'block' : 'none';
}, function (_ref4) {
  var wide = _ref4.wide;
  return wide ? '100%' : '0';
}, function (_ref5) {
  var opened = _ref5.opened;
  return opened ? '2' : '1';
}, textPrimary$1, contentBackground$1, contentBorder$1);

var DropDownActiveItem = getPublicUrl(styled(DropDownItem).withConfig({
  displayName: 'DropDown__DropDownActiveItem'
})(['padding-right:40px;background:', ' url(', ') no-repeat calc(100% - 15px) 50%;border:1px solid ', ';border-radius:3px;&:hover,&:focus{color:inherit;}&:active{color:', ';}'], contentBackground$1, styledPublicUrl(arrow), contentBorder$1, textPrimary$1));

var DropDown = function (_React$Component) {
  inherits(DropDown, _React$Component);

  function DropDown() {
    var _ref6;

    var _temp, _this, _ret;

    classCallCheck(this, DropDown);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref6 = DropDown.__proto__ || Object.getPrototypeOf(DropDown)).call.apply(_ref6, [this].concat(args))), _this), _this.state = {
      opened: false
    }, _this.handleToggle = function () {
      _this.setState({ opened: !_this.state.opened });
    }, _this.handleClose = function () {
      _this.setState({ opened: false });
    }, _this.handleItemActivate = function (index, _ref7) {
      var keyboard = _ref7.keyboard;

      _this.props.onChange(index, _this.props.items);
      _this.setState({ opened: false });
      if (_this.activeItemElt && keyboard) {
        _this.activeItemElt.focus();
      }
    }, _temp), possibleConstructorReturn(_this, _ret);
  }

  createClass(DropDown, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          items = _props.items,
          active = _props.active,
          wide = _props.wide;
      var opened = this.state.opened;

      var activeItem = items[active] || items[0];
      return React.createElement(
        reactOnclickout,
        { onClickOut: this.handleClose },
        React.createElement(
          StyledDropDown,
          { wide: wide, opened: opened },
          React.createElement(
            DropDownActiveItem,
            {
              onActivate: this.handleToggle,
              mainRef: function mainRef(el) {
                return _this2.activeItemElt = el;
              }
            },
            activeItem
          ),
          React.createElement(
            reactMotion_1,
            {
              style: {
                openProgress: reactMotion_4(Number(opened), spring('normal')),
                closeProgress: reactMotion_4(Number(opened), spring('fast'))
              }
            },
            function (_ref8) {
              var openProgress = _ref8.openProgress,
                  closeProgress = _ref8.closeProgress;

              var scale = opened ? lerp(openProgress, 0.98, 1) : 1;
              return React.createElement(
                DropDownItems,
                {
                  role: 'listbox',
                  opened: openProgress > 0,
                  wide: wide,
                  style: {
                    transform: 'scale(' + scale + ',' + scale + ')',
                    opacity: opened ? openProgress : closeProgress
                  }
                },
                items.length ? items.map(function (item, i) {
                  return React.createElement(
                    DropDownItem,
                    {
                      role: 'option',
                      key: i,
                      index: i,
                      active: i === active,
                      onActivate: _this2.handleItemActivate
                    },
                    item
                  );
                }) : NON_BREAKING_SPACE
              );
            }
          )
        )
      );
    }
  }]);
  return DropDown;
}(React.Component);

DropDown.defaultProps = {
  items: [],
  active: 0,
  wide: false,
  onChange: function onChange() {}
};

var StyledText = styled.span.withConfig({
  displayName: 'Text__StyledText'
})(['', ';', ';', ';'], function (_ref) {
  var size = _ref.size,
      weight = _ref.weight;
  return font({ size: size, weight: weight });
}, function (_ref2) {
  var smallcaps = _ref2.smallcaps;

  if (!smallcaps) return '';
  return '\n      text-transform: lowercase;\n      font-variant: small-caps;\n    ';
}, function (_ref3) {
  var color = _ref3.color;

  return 'color: ' + (color || theme.textPrimary);
});

var Text = function Text(props) {
  return React.createElement(StyledText, props);
};

var createTextContainer = function createTextContainer(Element, defaultProps) {
  var Container = function Container(_ref4) {
    var children = _ref4.children,
        color = _ref4.color,
        size = _ref4.size,
        smallcaps = _ref4.smallcaps,
        weight = _ref4.weight,
        props = objectWithoutProperties(_ref4, ['children', 'color', 'size', 'smallcaps', 'weight']);

    var textProps = { color: color, size: size, smallcaps: smallcaps, weight: weight };
    return React.createElement(
      Element,
      props,
      React.createElement(
        Text,
        textProps,
        children
      )
    );
  };
  Container.defaultProps = defaultProps;

  return Container;
};

Text.Block = createTextContainer('div');
Text.Paragraph = createTextContainer('p');

var TypedText = Text;

var StyledField = styled.div.withConfig({
  displayName: 'Field__StyledField'
})(['margin-bottom:20px;']);

var StyledAsterisk = styled.span.withConfig({
  displayName: 'Field__StyledAsterisk'
})(['color:', ';float:right;padding-top:3px;font-size:12px;'], theme.accent);

var StyledTextBlock = styled(TypedText.Block).withConfig({
  displayName: 'Field__StyledTextBlock'
})(['', ';'], unselectable());

var Field = function Field(_ref) {
  var children = _ref.children,
      label = _ref.label,
      props = objectWithoutProperties(_ref, ['children', 'label']);

  var isRequired = React.Children.toArray(children).some(function (_ref2) {
    var childProps = _ref2.props;
    return childProps.required;
  });
  return React.createElement(
    StyledField,
    props,
    React.createElement(
      'label',
      null,
      React.createElement(
        StyledTextBlock,
        { color: theme.textSecondary, smallcaps: true },
        label,
        isRequired && React.createElement(
          StyledAsterisk,
          { title: 'Required' },
          '*'
        )
      ),
      children
    )
  );
};

var Attention = function Attention(props) {
  return React.createElement(
    "svg",
    _extends({ width: 14, height: 14, viewBox: "0 0 14 14" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("rect", { fill: "#DAEAEF", width: 14, height: 14, rx: 7 }),
      React.createElement("path", {
        d: "M6.155 8.547h1.298V3.3H6.155v5.247zM6.045 11h1.529V9.537H6.045V11z",
        fill: "#6D777B",
        opacity: 0.7
      })
    )
  );
};

var Bylaw = function Bylaw(props) {
  return React.createElement(
    "svg",
    _extends({ width: 17, height: 16, viewBox: "0 0 17 16" }, props),
    React.createElement(
      "g",
      { fill: "none", fillRule: "evenodd" },
      React.createElement("path", { d: "M-2-2h22v22H-2z" }),
      React.createElement(
        "g",
        { opacity: 0.8, stroke: "currentColor" },
        React.createElement("path", {
          d: "M9.036 1.143L1.578 4.357V5.43h14.916V4.357L9.036 1.143zm6.88 12.393H2.071c-.318 0-.577.242-.577.535v1.072h15V14.07c0-.293-.26-.535-.578-.535z",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }),
        React.createElement("path", { d: "M3 5v8.034M6 5v8.275M9 5v8.034M12 5v8.275M15 5v8.275" })
      )
    )
  );
};

var Icon = styled.span.withConfig({
  displayName: 'IconInfo__Icon'
})(['margin-right:10px;']);

var Title$1 = styled.div.withConfig({
  displayName: 'IconInfo__Title'
})(['color:', ';margin-bottom:2px;display:flex;align-items:center;', ';'], theme.textSecondary, font({ size: 'small' }));

var TitlelessBody = styled.div.withConfig({
  displayName: 'IconInfo__TitlelessBody'
})(['display:flex;align-items:center;']);

var IconInfo = function IconInfo(_ref) {
  var children = _ref.children,
      icon = _ref.icon,
      title = _ref.title,
      props = objectWithoutProperties(_ref, ['children', 'icon', 'title']);

  var titleElm = title;
  var bodyElm = React.createElement(
    TitlelessBody,
    null,
    icon && React.createElement(
      Icon,
      null,
      icon
    ),
    children
  );
  if (title) {
    titleElm = React.createElement(
      Title$1,
      null,
      icon && React.createElement(
        Icon,
        null,
        icon
      ),
      title
    );
    bodyElm = children;
  }
  return React.createElement(
    Info$1,
    _extends({ title: titleElm }, props),
    bodyElm
  );
};
IconInfo.propTypes = {
  children: propTypes.node,
  icon: propTypes.node,
  title: propTypes.node
};

var Action = function Action(props) {
  return React.createElement(IconInfo, _extends({ icon: React.createElement(Attention, null) }, props));
};

var PermissionIconInfo = styled(IconInfo).withConfig({
  displayName: 'IconInfo__PermissionIconInfo'
})(['', '{color:', ';}'], Icon, theme.infoPermissionsIcon);

var Permissions$2 = function Permissions(props) {
  return React.createElement(PermissionIconInfo, _extends({
    background: theme.infoPermissionsBackground,
    icon: React.createElement(Bylaw, null)
  }, props));
};

var Info$1 = function Info(_ref) {
  var children = _ref.children,
      title = _ref.title,
      props = objectWithoutProperties(_ref, ['children', 'title']);
  return React.createElement(
    Main$2,
    props,
    title && React.createElement(
      Title,
      null,
      title
    ),
    children
  );
};
Info$1.propTypes = {
  background: propTypes.string,
  children: propTypes.node,
  title: propTypes.node
};
Info$1.defaultProps = {
  background: theme.infoBackground
};

var Main$2 = styled.section.withConfig({
  displayName: 'Info__Main'
})(['background:', ';padding:15px;border-radius:3px;word-wrap:break-word;'], function (_ref2) {
  var background = _ref2.background;
  return background;
});

var Title = styled.h1.withConfig({
  displayName: 'Info__Title'
})(['display:flex;']);

Info$1.Action = Action;
Info$1.Permissions = Permissions$2;

// Utility styles for the radio input
var radioActive = css(['background:transparent;&:after{content:\'\';}']);

var radioDimmed = css(['', ';&:after{opacity:0.5;transition:none;}'], radioActive);

// Styled component
var RadioButton = styled.input.attrs({
  type: 'radio'
}).withConfig({
  displayName: 'RadioButton'
})(['appearance:none;display:inline-flex;position:relative;background:', ';border:1px ', ' solid;border-radius:7px;width:14px;height:14px;outline:none;cursor:pointer;align-items:center;justify-content:center;&:checked,&:focus,&:hover{', ';}&:after{position:absolute;background:', ';width:8px;height:8px;border-radius:4px;transition:opacity 200ms linear;}&:not(:checked):focus,&:not(:checked):hover{', ';}'], theme.secondaryBackground, theme.contentBorder, radioActive, theme.accent, radioDimmed);

RadioButton.css = {
  active: radioActive,
  dimmed: radioDimmed
};

var StyledInput = styled.input.withConfig({
  displayName: 'TextInput__StyledInput'
})(['', ';width:', ';padding:5px 10px;background:', ';border:1px solid ', ';border-radius:3px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.06);color:', ';appearance:none;&:focus{outline:none;border-color:', ';}&:read-only{color:transparent;text-shadow:0 0 0 ', ';}'], font({ size: 'small', weight: 'normal' }), function (_ref) {
  var wide = _ref.wide;
  return wide ? '100%' : 'auto';
}, theme.contentBackground, theme.contentBorder, theme.textPrimary, theme.contentBorderActive, theme.textSecondary);

var TextInput = function TextInput(props) {
  return React.createElement(StyledInput, props);
};
TextInput.defaultProps = {
  type: 'text'
};

TextInput.Number = function (props) {
  return React.createElement(StyledInput, _extends({ type: 'number' }, props));
};

var logo = "feef84fc525d4290.svg";

var iconTwitter = "data:image/svg+xml,%3Csvg%20width%3D%2215%22%20height%3D%2230%22%20viewBox%3D%220%200%2015%2030%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%3Cuse%20xlink%3Ahref%3D%22%23a%22%20fill%3D%22%23717171%22%2F%3E%3Cdefs%3E%3Cpath%20id%3D%22a%22%20d%3D%22M13.56%2010.558a5.42%205.42%200%200%201-1.557.419%202.7%202.7%200%200%200%201.189-1.49%205.323%205.323%200%200%201-1.716.652%202.697%202.697%200%200%200-1.975-.853%202.702%202.702%200%200%200-2.704%202.703c0%20.21.025.419.067.62a7.685%207.685%200%200%201-5.575-2.83%202.702%202.702%200%200%200%20.837%203.616%202.724%202.724%200%200%201-1.222-.342v.033c0%201.314.93%202.402%202.168%202.653a2.858%202.858%200%200%201-.712.092c-.175%200-.343-.016-.51-.041a2.708%202.708%200%200%200%202.528%201.875A5.414%205.414%200%200%201%201.02%2018.82a5.62%205.62%200%200%201-.653-.034A7.64%207.64%200%200%200%204.52%2020c4.972%200%207.693-4.118%207.693-7.693%200-.117%200-.234-.009-.351a5.81%205.81%200%200%200%201.356-1.398z%22%2F%3E%3C%2Fdefs%3E%3C%2Fsvg%3E";

var iconMedium = "data:image/svg+xml,%3Csvg%20width%3D%2216%22%20height%3D%2230%22%20viewBox%3D%220%200%2016%2030%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%3Cuse%20xlink%3Ahref%3D%22%23a%22%20fill%3D%22%23717171%22%2F%3E%3Cdefs%3E%3Cpath%20id%3D%22a%22%20d%3D%22M4.997%2010.667a.117.117%200%200%200-.025-.042L.695%208.482C.578%208.424.46%208.357.326%208.357.1%208.357%200%208.549%200%208.758v9.543c0%20.25.184.552.419.67l3.892%201.95a.612.612%200%200%200%20.276.067c.285%200%20.41-.243.41-.503v-9.818zm.536.845v5.023l4.47%202.226-4.47-7.249zm9.467.15l-4.52%207.342%203.691%201.841a.793.793%200%200%200%20.394.11c.276%200%20.435-.193.435-.47v-8.822zm-.025-1.004a.056.056%200%200%200-.034-.05l-4.528-2.26a.488.488%200%200%200-.218-.05.505.505%200%200%200-.435.234l-2.712%204.412%203.264%205.307c.335-.536%204.663-7.559%204.663-7.593z%22%2F%3E%3C%2Fdefs%3E%3C%2Fsvg%3E";

var iconRocket = "data:image/svg+xml,%3Csvg%20width%3D%2218%22%20height%3D%2215%22%20viewBox%3D%220%200%2018%2015%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M18%207.488c0-.885-.27-1.734-.804-2.523-.479-.708-1.15-1.336-1.994-1.864-1.63-1.02-3.773-1.581-6.033-1.581-.755%200-1.5.062-2.221.186A7.358%207.358%200%200%200%205.42.634C2.458-.773%200%20.6%200%20.6s2.285%201.838%201.913%203.45C.891%205.044.337%206.24.337%207.488v.024c0%201.247.554%202.444%201.576%203.437C2.285%2012.561%200%2014.4%200%2014.4s2.458%201.374%205.421-.033a7.355%207.355%200%200%200%201.527-1.072c.722.124%201.466.186%202.22.186%202.26%200%204.403-.561%206.034-1.581.844-.528%201.515-1.156%201.994-1.864.534-.789.804-1.638.804-2.523v-.025zm-8.828%204.864c-.951%200-1.862-.108-2.704-.304-.855%201.007-2.737%202.409-4.565%201.956.594-.626%201.475-1.683%201.287-3.424-1.096-.835-1.754-1.903-1.754-3.068%200-2.673%203.464-4.84%207.736-4.84s7.736%202.167%207.736%204.84-3.464%204.84-7.736%204.84zm1.028-4.84c0%20.556-.46%201.007-1.028%201.007a1.017%201.017%200%200%201-1.027-1.007c0-.556.46-1.006%201.027-1.006.568%200%201.028.45%201.028%201.006zm2.545-1.006c-.567%200-1.027.45-1.027%201.006s.46%201.007%201.027%201.007c.568%200%201.028-.451%201.028-1.007%200-.556-.46-1.006-1.028-1.006zm-7.146%200c-.567%200-1.027.45-1.027%201.006s.46%201.007%201.027%201.007c.568%200%201.028-.451%201.028-1.007%200-.556-.46-1.006-1.028-1.006z%22%20fill%3D%22%23717171%22%2F%3E%3C%2Fsvg%3E";

var medium$1 = function medium(css$$1) {
  return breakpoint('medium', css$$1);
};
var large$1 = function large(css$$1) {
  return breakpoint('large', css$$1);
};

var StyledFooter = getPublicUrl(styled.footer.withConfig({
  displayName: 'Footer__StyledFooter'
})(['padding:60px 20px 35px;font-size:15px;color:grey;background:', ';', ';.main{display:flex;align-items:center;flex-direction:column;margin:0 auto;}.logo{margin-bottom:60px;}.menus{display:flex;}.menu-1{margin-right:35px;}.social-links{display:flex;justify-content:center;margin-top:30px;}.social-links li{display:flex;}.icon{overflow:hidden;text-indent:-9999px;padding-left:30px;background-repeat:no-repeat;background-position:50% 50%;}li{list-style:none;line-height:2;}a{text-decoration:none;}strong a{color:', ';font-weight:400;}.icon.twitter{background-image:url(', ');}.icon.medium{background-image:url(', ');}.icon.rocket{background-image:url(', ');}', ';', ';'], colors.Rain['Shark'], function (_ref) {
  var compact = _ref.compact;

  if (!compact) return '';
  return '\n      padding-top: 30px;\n      padding-bottom: 30px;\n      .icon {\n        padding-left: 25px;\n      }\n    ';
}, themeDark.accent, styledPublicUrl(iconTwitter), styledPublicUrl(iconMedium), styledPublicUrl(iconRocket), medium$1('\n    padding-bottom: 70px;\n\n    .all-links {\n      display: flex;\n      justify-content: space-between;\n    }\n    .social-links {\n      display: block;\n      margin-top: 0;\n      margin-left: 120px;\n    }\n    .social-links li {\n      display: block;\n    }\n    .icon {\n      overflow: visible;\n      text-indent: 0;\n      background-position: 0 50%;\n    }\n  '), large$1('\n    padding-top: 90px;\n    .main {\n      flex-direction: row;\n      max-width: ' + grid(12, 11) + 'px;\n    }\n    .logo {\n      width: ' + grid(3, 3) + 'px;\n      flex-shrink: 0;\n    }\n    .menus {\n      display: flex;\n      width: ' + grid(6, 6) + 'px;\n    }\n    .menu-1 {\n      width: ' + grid(2, 2) + 'px;\n      margin-right: 0;\n    }\n    .menu-2 {\n      width: ' + grid(4, 4) + 'px;\n    }\n    .social-links {\n      width: ' + grid(3) + 'px;\n      margin-left: 0;\n    }\n    li {\n      margin: 0 0 10px;\n      line-height: 1.5;\n    }\n  ')));

var DefaultProps$2 = {
  compact: false
};

var Footer = function Footer(_ref2) {
  var compact = _ref2.compact,
      publicUrl = _ref2.publicUrl;
  return React.createElement(
    StyledFooter,
    { compact: compact },
    React.createElement(
      'div',
      { className: 'main' },
      React.createElement(
        'div',
        { className: 'logo' },
        React.createElement('img', { src: publicUrl + logo, width: '158', height: '50', alt: 'Aragon' })
      ),
      React.createElement(
        'div',
        { className: 'all-links' },
        !compact && React.createElement(
          'div',
          { className: 'menus' },
          React.createElement(
            'nav',
            { className: 'menu-1' },
            React.createElement(
              'ul',
              null,
              React.createElement(
                'li',
                null,
                React.createElement(
                  'a',
                  { href: 'https://aragon.one/core' },
                  'Core'
                )
              ),
              React.createElement(
                'li',
                null,
                React.createElement(
                  'a',
                  { href: 'https://aragon.one/network' },
                  'Network'
                )
              ),
              React.createElement(
                'li',
                null,
                React.createElement(
                  'a',
                  { href: 'https://aragon.one/foundation' },
                  'Foundation'
                )
              ),
              React.createElement(
                'li',
                null,
                React.createElement(
                  'a',
                  { href: 'https://aragon.one/about' },
                  'About'
                )
              )
            )
          ),
          React.createElement(
            'nav',
            { className: 'menu-2' },
            React.createElement(
              'ul',
              null,
              React.createElement(
                'li',
                null,
                React.createElement(
                  'a',
                  { href: 'https://wiki.aragon.one', target: '_blank' },
                  'Wiki'
                )
              ),
              React.createElement(
                'li',
                null,
                React.createElement(
                  'a',
                  { href: 'https://github.com/aragon', target: '_blank' },
                  'Code'
                )
              ),
              React.createElement(
                'li',
                null,
                React.createElement(
                  'a',
                  { href: 'https://aragon.one/join' },
                  'Join us'
                )
              ),
              React.createElement(
                'li',
                null,
                React.createElement(
                  'strong',
                  null,
                  React.createElement(
                    'a',
                    { href: 'https://github.com/aragon/aragon/releases', target: '_blank' },
                    'Download'
                  )
                )
              )
            )
          )
        ),
        React.createElement(
          'ul',
          { className: 'social-links' },
          React.createElement(
            'li',
            null,
            React.createElement(
              'a',
              { href: 'https://twitter.com/AragonProject', className: 'icon twitter', target: '_blank' },
              'Twitter'
            )
          ),
          React.createElement(
            'li',
            null,
            React.createElement(
              'a',
              { href: 'https://blog.aragon.one/', className: 'icon medium', target: '_blank' },
              'Medium'
            )
          ),
          React.createElement(
            'li',
            null,
            React.createElement(
              'a',
              { href: 'https://aragon.chat/', className: 'icon rocket', target: '_blank' },
              'Community'
            )
          )
        )
      )
    )
  );
};

Footer.defaultProps = DefaultProps$2;

var Footer$1 = getPublicUrl(Footer);

var logo$1 = "data:image/svg+xml,%3Csvg%20width%3D%22200%22%20height%3D%22183%22%20viewBox%3D%220%200%20200%20183%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20x1%3D%2240.59%25%22%20y1%3D%22172.164%25%22%20x2%3D%22134.278%25%22%20y2%3D%22-209.701%25%22%20id%3D%22a%22%3E%3Cstop%20stop-color%3D%22%230B0B0A%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23464F51%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%220%25%22%20y1%3D%22125.497%25%22%20x2%3D%2263.448%25%22%20y2%3D%22-8.979%25%22%20id%3D%22b%22%3E%3Cstop%20stop-color%3D%22%230B0B0A%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23464F51%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%2272.854%25%22%20y1%3D%22157.035%25%22%20x2%3D%2272.854%25%22%20y2%3D%2250%25%22%20id%3D%22c%22%3E%3Cstop%20stop-color%3D%22%230B0B0A%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23464F51%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%220%25%22%20y1%3D%22140.325%25%22%20x2%3D%22122.689%25%22%20y2%3D%22-73.565%25%22%20id%3D%22d%22%3E%3Cstop%20stop-color%3D%22%230B0B0A%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23464F51%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%220%25%22%20y1%3D%2295.2%25%22%20x2%3D%2276.121%25%22%20y2%3D%22-21.873%25%22%20id%3D%22e%22%3E%3Cstop%20stop-color%3D%22%230B0B0A%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23464F51%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cpath%20d%3D%22M99.9%200l-2.912.915C87.782%203.887%2039.932%2020.343%201.893%2052.57L0%2054.17l.465%202.626c.784%204.268%205.341%2026.823%2018.048%2051.836%208.171%2016.031%2018.16%2030.102%2029.693%2041.824%2014.051%2014.241%2030.459%2024.802%2048.78%2031.396l2.972%201.05%201.937-.753%201.03-.364c18.209-6.553%2034.615-17.112%2048.764-31.388%2011.467-11.593%2021.458-25.666%2029.695-41.827%2012.782-25.102%2017.587-48.377%2018.076-52.006h.005l.456-2.592-2.056-1.468C159.836%2020.318%20112.047%203.884%20102.87.923L99.9%200z%22%20fill%3D%22url%28%23a%29%22%2F%3E%3Cpath%20d%3D%22M85.23%2043.803c-.061%200-28.567%209.109-28.567%2034.02%200%2024.912%2027.515%2036.995%2047.778%2036.995%2011.021%200%2020.075-3.208%2026.047-6.134.77-3.531%203.569-11.895%2012.83-11.958%201.651-.064%203.2.246%204.502.99%206.197%203.346%202.17%209.604%202.17%209.604a13.943%2013.943%200%200%200%201.416-.306c7.448-2.006%2015.84-10.525%2014.385-24.791-1.167-11.44-11.726-18.69-16.862-21.57-1.681-.944-2.782-1.42-2.782-1.42.186-1.162.246-2.061.246-2.751%200-.13-.002-.251-.006-.365v-1.34c-26.952-16.35-49.76-18.868-61.01-18.868-4.859%200-7.582.457-7.582.457l7.436%207.437zm56.95%2015.491s-3.656-1.177-7.373-1.673c-1.86%201.921-3.471%202.727-3.967%202.975l-.124.124c-10.844-2.293-14.748-7.87-14.748-7.87%2010.225-.062%2019.458%202.354%2026.212%206.444z%22%20fill%3D%22url%28%23b%29%22%20opacity%3D%22.401%22%2F%3E%3Cpath%20d%3D%22M152.281%2074.725c0%208.118-3.345%2015.616-9.047%2021.689l-.271.312.457-.002c1.549-.062%203.098.248%204.4.991%206.197%203.347%202.17%209.605%202.17%209.605%207.745-1.239%2017.35-9.914%2015.8-25.097-1.166-11.44-11.725-18.69-16.86-21.57a31.046%2031.046%200%200%201%203.351%2014.072%22%20fill%3D%22url%28%23c%29%22%20opacity%3D%22.1%22%2F%3E%3Cpath%20d%3D%22M26.857%20103.168c0%201.006.039%201.962.095%202.897%207.669%2014.75%2016.894%2027.635%2027.446%2038.305%2013.159%2013.278%2028.47%2023.13%2045.52%2029.29%2016.986-6.139%2032.299-16.012%2045.521-29.353a141.977%20141.977%200%200%200%2011.21-12.826c-28.27-2.032-26.553-19.203-26.553-19.203%200-.681%200-1.363.124-2.045%200%200%20.063-.603.269-1.55-5.972%202.927-15.026%206.135-26.048%206.135-20.263%200-47.778-12.083-47.778-36.995%200-24.911%2028.506-34.02%2028.506-34.02l-.015-.005a29.86%2029.86%200%200%200-2.216-.058c-31.17%201.116-56.081%2027.267-56.081%2059.428%22%20fill%3D%22url%28%23d%29%22%20opacity%3D%22.453%22%2F%3E%3Cpath%20d%3D%22M99.9%200l-2.912.915C87.782%203.887%2039.932%2020.343%201.893%2052.57L0%2054.17l.465%202.626c.784%204.268%205.341%2026.823%2018.048%2051.836%208.171%2016.031%2018.16%2030.102%2029.693%2041.824%2014.051%2014.241%2030.459%2024.802%2048.78%2031.396l2.972%201.05%201.937-.753%201.03-.364c18.209-6.553%2034.615-17.112%2048.764-31.388%2011.467-11.593%2021.458-25.666%2029.695-41.827%2012.782-25.102%2017.587-48.377%2018.076-52.006h.005l.456-2.592-2.056-1.468C159.836%2020.318%20112.047%203.884%20102.87.923L99.9%200zM54.399%20144.37c-10.861-10.983-20.322-24.306-28.123-39.602C15.523%2083.71%2010.912%2064.732%209.436%2057.59%2045.466%2027.844%2089.521%2012.462%2099.914%209.1c10.445%203.408%2054.72%2018.972%2090.482%2048.489-1.489%207.117-6.123%2026.018-16.836%2047.055-7.843%2015.38-17.305%2028.724-28.12%2039.662-13.223%2013.341-28.536%2023.214-45.522%2029.353-17.05-6.16-32.361-16.012-45.52-29.29z%22%20fill%3D%22url%28%23e%29%22%20opacity%3D%22.127%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";

var bgLandscape = "data:image/svg+xml,%3Csvg%20width%3D%221440%22%20height%3D%22491%22%20viewBox%3D%220%200%201440%20491%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%3Cdefs%3E%3ClinearGradient%20x1%3D%22-14.438%25%22%20y1%3D%22107.641%25%22%20x2%3D%2298.443%25%22%20y2%3D%22-54.066%25%22%20id%3D%22b%22%3E%3Cstop%20stop-color%3D%22%230B0B0A%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23464F51%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3Cpath%20id%3D%22a%22%20d%3D%22M0%200h720v491H0z%22%2F%3E%3ClinearGradient%20x1%3D%2295.341%25%22%20y1%3D%2296.71%25%22%20x2%3D%2237.949%25%22%20y2%3D%228.725%25%22%20id%3D%22d%22%3E%3Cstop%20stop-color%3D%22%23C8C8C8%22%20stop-opacity%3D%220%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23979797%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%2225.323%25%22%20y1%3D%2264.209%25%22%20x2%3D%22-177.025%25%22%20y2%3D%22232.498%25%22%20id%3D%22e%22%3E%3Cstop%20stop-color%3D%22%23C8C8C8%22%20stop-opacity%3D%220%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23979797%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%2298.443%25%22%20y1%3D%22-54.066%25%22%20x2%3D%22-14.438%25%22%20y2%3D%22107.641%25%22%20id%3D%22g%22%3E%3Cstop%20stop-color%3D%22%230B0B0A%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23464F51%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3Cpath%20id%3D%22f%22%20d%3D%22M0%200h720v491H0z%22%2F%3E%3ClinearGradient%20x1%3D%22224.819%25%22%20y1%3D%22-159.682%25%22%20x2%3D%2229.43%25%22%20y2%3D%2296.423%25%22%20id%3D%22i%22%3E%3Cstop%20stop-color%3D%22%23C8C8C8%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23979797%22%20stop-opacity%3D%220%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%2250%25%22%20y1%3D%220%25%22%20x2%3D%2250%25%22%20y2%3D%2297.636%25%22%20id%3D%22j%22%3E%3Cstop%20stop-color%3D%22%23C8C8C8%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23979797%22%20stop-opacity%3D%220%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%2250%25%22%20y1%3D%220%25%22%20x2%3D%22-96.692%25%22%20y2%3D%22190.844%25%22%20id%3D%22k%22%3E%3Cstop%20stop-color%3D%22%23C8C8C8%22%20stop-opacity%3D%220%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23C7C7C7%22%20stop-opacity%3D%22.012%22%20offset%3D%221.236%25%22%2F%3E%3Cstop%20stop-color%3D%22%23979797%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20transform%3D%22translate%28720%29%22%3E%3Cmask%20id%3D%22c%22%20fill%3D%22%23fff%22%3E%3Cuse%20xlink%3Ahref%3D%22%23a%22%2F%3E%3C%2Fmask%3E%3Cuse%20fill%3D%22url%28%23b%29%22%20xlink%3Ahref%3D%22%23a%22%2F%3E%3Cg%20mask%3D%22url%28%23c%29%22%20stroke-linecap%3D%22square%22%3E%3Cpath%20d%3D%22M.5%201l552%20533%22%20stroke%3D%22url%28%23d%29%22%20opacity%3D%22.446%22%20transform%3D%22translate%28132%20-284%29%22%2F%3E%3Cpath%20d%3D%22M429.5%20414.5L805.854%2038.146%22%20stroke%3D%22url%28%23e%29%22%20transform%3D%22translate%28132%20-284%29%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cmask%20id%3D%22h%22%20fill%3D%22%23fff%22%3E%3Cuse%20xlink%3Ahref%3D%22%23f%22%2F%3E%3C%2Fmask%3E%3Cuse%20fill%3D%22url%28%23g%29%22%20xlink%3Ahref%3D%22%23f%22%2F%3E%3Cg%20mask%3D%22url%28%23h%29%22%20stroke-linecap%3D%22square%22%3E%3Cpath%20d%3D%22M.5%20700.5l376.354-376.354%22%20stroke%3D%22url%28%23i%29%22%20transform%3D%22translate%28-347%20-99%29%22%2F%3E%3Cpath%20d%3D%22M162.5%20116l552%20533%22%20stroke%3D%22url%28%23j%29%22%20opacity%3D%22.446%22%20transform%3D%22translate%28-347%20-99%29%22%2F%3E%3Cpath%20d%3D%22M433.5%20376.5L809.854.146%22%20stroke%3D%22url%28%23k%29%22%20opacity%3D%22.446%22%20transform%3D%22translate%28-347%20-99%29%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E";

var bgPortrait = "data:image/svg+xml,%3Csvg%20width%3D%22768%22%20height%3D%22880%22%20viewBox%3D%220%200%20768%20880%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%3E%3Cdefs%3E%3ClinearGradient%20x1%3D%22-14.438%25%22%20y1%3D%22107.641%25%22%20x2%3D%2298.443%25%22%20y2%3D%22-54.066%25%22%20id%3D%22b%22%3E%3Cstop%20stop-color%3D%22%230B0B0A%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23464F51%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3Cpath%20id%3D%22a%22%20d%3D%22M0%200h768v440H0z%22%2F%3E%3ClinearGradient%20x1%3D%2295.341%25%22%20y1%3D%2296.71%25%22%20x2%3D%2237.949%25%22%20y2%3D%228.725%25%22%20id%3D%22d%22%3E%3Cstop%20stop-color%3D%22%23C8C8C8%22%20stop-opacity%3D%220%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23979797%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%2225.323%25%22%20y1%3D%2264.209%25%22%20x2%3D%22-177.025%25%22%20y2%3D%22232.498%25%22%20id%3D%22e%22%3E%3Cstop%20stop-color%3D%22%23C8C8C8%22%20stop-opacity%3D%220%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23979797%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%2298.443%25%22%20y1%3D%22-54.066%25%22%20x2%3D%22-14.438%25%22%20y2%3D%22107.641%25%22%20id%3D%22g%22%3E%3Cstop%20stop-color%3D%22%230B0B0A%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23464F51%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3Cpath%20id%3D%22f%22%20d%3D%22M0%200h768v440H0z%22%2F%3E%3ClinearGradient%20x1%3D%22224.819%25%22%20y1%3D%22-159.682%25%22%20x2%3D%2229.43%25%22%20y2%3D%2296.423%25%22%20id%3D%22i%22%3E%3Cstop%20stop-color%3D%22%23C8C8C8%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23979797%22%20stop-opacity%3D%220%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%2250%25%22%20y1%3D%220%25%22%20x2%3D%2250%25%22%20y2%3D%2297.636%25%22%20id%3D%22j%22%3E%3Cstop%20stop-color%3D%22%23C8C8C8%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23979797%22%20stop-opacity%3D%220%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%2250%25%22%20y1%3D%220%25%22%20x2%3D%22-96.692%25%22%20y2%3D%22190.844%25%22%20id%3D%22k%22%3E%3Cstop%20stop-color%3D%22%23C8C8C8%22%20stop-opacity%3D%220%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23C7C7C7%22%20stop-opacity%3D%22.012%22%20offset%3D%221.236%25%22%2F%3E%3Cstop%20stop-color%3D%22%23979797%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20transform%3D%22translate%280%20440%29%22%3E%3Cmask%20id%3D%22c%22%20fill%3D%22%23fff%22%3E%3Cuse%20xlink%3Ahref%3D%22%23a%22%2F%3E%3C%2Fmask%3E%3Cuse%20fill%3D%22url%28%23b%29%22%20xlink%3Ahref%3D%22%23a%22%2F%3E%3Cg%20mask%3D%22url%28%23c%29%22%20stroke-linecap%3D%22square%22%3E%3Cpath%20d%3D%22M.5%201l552%20533%22%20stroke%3D%22url%28%23d%29%22%20opacity%3D%22.446%22%20transform%3D%22translate%28180%20-284%29%22%2F%3E%3Cpath%20d%3D%22M429.5%20414.5L805.854%2038.146%22%20stroke%3D%22url%28%23e%29%22%20transform%3D%22translate%28180%20-284%29%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cmask%20id%3D%22h%22%20fill%3D%22%23fff%22%3E%3Cuse%20xlink%3Ahref%3D%22%23f%22%2F%3E%3C%2Fmask%3E%3Cuse%20fill%3D%22url%28%23g%29%22%20xlink%3Ahref%3D%22%23f%22%2F%3E%3Cg%20mask%3D%22url%28%23h%29%22%20stroke-linecap%3D%22square%22%3E%3Cpath%20d%3D%22M.5%20700.5l376.354-376.354%22%20stroke%3D%22url%28%23i%29%22%20transform%3D%22translate%28-347%20-99%29%22%2F%3E%3Cpath%20d%3D%22M162.5%20116l552%20533%22%20stroke%3D%22url%28%23j%29%22%20opacity%3D%22.446%22%20transform%3D%22translate%28-347%20-99%29%22%2F%3E%3Cpath%20d%3D%22M433.5%20376.5L809.854.146%22%20stroke%3D%22url%28%23k%29%22%20opacity%3D%22.446%22%20transform%3D%22translate%28-347%20-99%29%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E";

var large$2 = function large(css$$1) {
  return breakpoint('large', css$$1);
};

var Main$3 = getPublicUrl(styled.div.withConfig({
  displayName: 'PreFooter__Main'
})(['position:relative;overflow:hidden;background-color:', ';background-repeat:no-repeat;background-position:50% 50%;background-size:cover;background-image:url(', ');', ';'], colors.Rain.Shark, styledPublicUrl(bgPortrait), large$2(css(['background-image:url(', ');'], styledPublicUrl(bgLandscape)))));

var Container = getPublicUrl(styled(Section).attrs({ visual: true }).withConfig({
  displayName: 'PreFooter__Container'
})(['position:relative;z-index:2;padding:0 20px;color:', ';.main{display:flex;flex-direction:column;align-items:center;width:100%;background:url(', ') no-repeat 50% 50%;background-size:140px;', ';}.section{display:flex;flex-direction:column;justify-content:center;width:100%;max-width:', 'px;min-height:400px;height:50%;text-align:center;}.title{margin-bottom:30px;color:', ';font-size:27px;}.desc{font-size:18px;margin-bottom:30px;}.desc:last-child{margin-bottom:0;}.desc a{color:', ';}.email input{width:100%;padding:10px;font-size:15px;border:0;border-radius:3px;background:#fff;}button{font-size:15px;}', ';'], themeDark.textTertiary, styledPublicUrl(logo$1), large$2('background-size: 200px;'), grid(4), themeDark.textPrimary, themeDark.textSecondary, large$2('\n    padding-top: 140px;\n    padding-bottom: 140px;\n\n    .main {\n      flex-direction: row;\n      justify-content: space-between;\n      align-items: flex-start;\n    }\n    .section {\n      min-height: 0;\n      width: ' + (grid(4) + 'px') + ';\n      justify-content: flex-start;\n      text-align: left;\n      padding-top: 0;\n    }\n    .section + .section {\n      text-align: right;\n      padding-bottom: 0;\n    }\n  ')));

var EmailFormDefault = function EmailFormDefault() {
  return React.createElement(
    'div',
    null,
    React.createElement(
      'h1',
      { className: 'title' },
      'Aragon Newsletter'
    ),
    React.createElement(
      'p',
      { className: 'desc' },
      'Follow the progress of Aragon by subscribing to our monthly newsletter'
    ),
    React.createElement(
      'p',
      { className: 'email' },
      React.createElement('input', { type: 'email', placeholder: 'Enter your email' })
    )
  );
};

var DefaultProps$3 = {
  emailForm: React.createElement(EmailFormDefault, null)
};

var PreFooter = function PreFooter(_ref) {
  var emailForm = _ref.emailForm;
  return React.createElement(
    Main$3,
    null,
    React.createElement(
      Container,
      null,
      React.createElement(
        'div',
        { className: 'main' },
        React.createElement(
          'section',
          { className: 'section' },
          emailForm
        ),
        React.createElement(
          'section',
          { className: 'section' },
          React.createElement(
            'h1',
            { className: 'title' },
            'Aragon Alpha'
          ),
          React.createElement(
            'p',
            { className: 'desc' },
            'Completely updated',
            React.createElement('br', null),
            ' Aragon Alpha v0.5 Coming Soon'
          ),
          React.createElement(
            'a',
            {
              href: 'https://blog.aragon.one/news-from-the-front-5820cd9f2e46',
              target: '_blank'
            },
            React.createElement(
              Button,
              { mode: 'strong', wide: true },
              'Learn More'
            )
          )
        )
      )
    )
  );
};

PreFooter.defaultProps = DefaultProps$3;

var StyledMenuItem = styled.li.withConfig({
  displayName: 'MenuItem__StyledMenuItem'
})(['display:flex;align-items:stretch;white-space:nowrap;> span{display:flex;align-items:center;padding:0 15px;font-size:15px;color:', ';}a{text-decoration:none;color:', ';}'], function (_ref) {
  var active = _ref.active;
  return active ? theme.accent : theme.textSecondary;
}, function (_ref2) {
  var active = _ref2.active;
  return active ? theme.accent : theme.textSecondary;
});

var DefaultProps$5 = {
  active: false,
  renderLink: function renderLink(_ref3) {
    var url = _ref3.url,
        children = _ref3.children;
    return React.createElement(
      'a',
      { href: url },
      children
    );
  }
};

var MenuItem = function MenuItem(_ref4) {
  var url = _ref4.url,
      label = _ref4.label,
      active = _ref4.active,
      renderLink = _ref4.renderLink;
  return React.createElement(
    StyledMenuItem,
    { active: active },
    React.createElement(
      'span',
      null,
      renderLink({ url: url, children: label })
    )
  );
};

MenuItem.defaultProps = DefaultProps$5;

var close = "data:image/svg+xml,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M20.297%205.64l-6.508%206.508%206.508%206.508-1.64%201.64-6.509-6.507-6.507%206.508L4%2018.657l6.508-6.509L4%205.641%205.64%204l6.508%206.508L18.656%204z%22%20fill%3D%22%23FFF%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E";

var open = "data:image/svg+xml,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M2%2019v-2.352h20V19H2zm0-5.852v-2.296h20v2.296H2zM2%205h20v2.352H2V5z%22%20fill%3D%22%23717171%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E";

var Container$1 = styled.div.withConfig({
  displayName: 'MenuPanel__Container'
})(['min-height:60px;', ';'], unselectable());

var PanelStyles = styled.div.withConfig({
  displayName: 'MenuPanel__PanelStyles'
})(['position:absolute;z-index:3;top:0;right:0;padding-top:70px;line-height:2;font-size:17px;background:', ';a{color:white;text-decoration:none;}'], theme.accent);

var PanelContent = styled.div.withConfig({
  displayName: 'MenuPanel__PanelContent'
})(['padding:0 60px 20px 30px;a{display:block;}']);

var Toggle = styled.a.attrs({ role: 'button' }).withConfig({
  displayName: 'MenuPanel__Toggle'
})(['position:absolute;right:0;z-index:4;height:60px;padding:0 15px;display:flex;align-items:center;cursor:pointer;']);

var Panel = function (_React$Component) {
  inherits(Panel, _React$Component);

  function Panel() {
    var _ref;

    var _temp, _this, _ret;

    classCallCheck(this, Panel);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = Panel.__proto__ || Object.getPrototypeOf(Panel)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      opened: false
    }, _this.toggle = function () {
      _this.setState({ opened: !_this.state.opened });
    }, _this.close = function () {
      _this.setState({ opened: false });
    }, _temp), possibleConstructorReturn(_this, _ret);
  }

  createClass(Panel, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          items = _props.items,
          publicUrl = _props.publicUrl,
          renderLink = _props.renderLink;
      var opened = this.state.opened;

      return React.createElement(
        reactMotion_1,
        {
          style: {
            openProgress: reactMotion_4(Number(opened), spring('fast'))
          }
        },
        function (_ref2) {
          var openProgress = _ref2.openProgress;
          return React.createElement(
            Container$1,
            null,
            React.createElement(
              reactOnclickout,
              { onClickOut: _this2.close },
              React.createElement(
                Toggle,
                { onClick: _this2.toggle },
                React.createElement('img', {
                  alt: '',
                  width: '22',
                  height: '22',
                  src: prefixUrl(opened ? close : open, publicUrl)
                })
              ),
              React.createElement(
                PanelStyles,
                {
                  style: {
                    display: openProgress > 0 ? 'block' : 'none',
                    opacity: openProgress,
                    transform: 'translateY(-' + (1 - openProgress) * 5 + 'px)'
                  }
                },
                React.createElement(
                  PanelContent,
                  null,
                  items.map(function (_ref3) {
                    var _ref4 = slicedToArray(_ref3, 3),
                        url = _ref4[0],
                        label = _ref4[1],
                        active = _ref4[2];

                    return React.createElement(
                      'div',
                      { key: url, onClick: _this2.close },
                      renderLink({
                        url: url,
                        children: label
                      })
                    );
                  })
                )
              )
            )
          );
        }
      );
    }
  }]);
  return Panel;
}(React.Component);

Panel.defaultProps = {
  renderLink: function renderLink(_ref5) {
    var url = _ref5.url,
        children = _ref5.children;
    return React.createElement(
      'a',
      { href: url },
      children
    );
  }
};


var MenuPanel = getPublicUrl(Panel);

var logo$2 = "6a089bdf02f98b6c.svg";

var logoCompact = "f2b90665d4eb28f3.svg";

var logoMinimal = "188027b3d4ea587a.svg";

var Container$2 = styled.span.withConfig({
  displayName: 'Logo__Container'
})(['display:flex;align-items:center;']);

var DefaultProps$6 = {
  compact: false,
  renderLink: function renderLink(_ref) {
    var url = _ref.url,
        children = _ref.children;
    return React.createElement(
      'a',
      { href: url },
      children
    );
  }
};

var Logo = function Logo(_ref2) {
  var compact = _ref2.compact,
      renderLink = _ref2.renderLink,
      publicUrl = _ref2.publicUrl;

  return React.createElement(
    'span',
    { className: 'logo' },
    renderLink({
      url: '/',
      children: React.createElement(
        Container$2,
        null,
        React.createElement(
          BreakPoint,
          { to: 'medium' },
          React.createElement('img', { alt: 'Aragon', src: publicUrl + logoMinimal, height: 40 })
        ),
        React.createElement(
          BreakPoint,
          { from: 'medium', to: 'large' },
          React.createElement('img', { alt: 'Aragon', src: publicUrl + logoMinimal, height: 50 })
        ),
        React.createElement(
          BreakPoint,
          { from: 'large' },
          React.createElement('img', {
            alt: 'Aragon',
            src: publicUrl + (compact ? logoCompact : logo$2),
            height: compact ? 36 : 51
          })
        )
      )
    })
  );
};

Logo.defaultProps = DefaultProps$6;

var Logo$1 = getPublicUrl(Logo);

var medium$2 = function medium(css$$1) {
  return breakpoint('medium', css$$1);
};
var large$3 = function large(css$$1) {
  return breakpoint('large', css$$1);
};

var StyledHeader = styled.div.withConfig({
  displayName: 'Header__StyledHeader'
})(['padding:0 12px;background:', ';.in{display:flex;justify-content:space-between;align-items:stretch;min-height:60px;max-width:1140px;margin:0 auto;}.menu,.buttons{display:flex;align-items:center;}.menu{align-items:stretch;}.logo,.logo a{display:flex;align-items:center;}.title{display:flex;align-items:center;margin-left:40px;}.menu-items{display:flex;align-items:center;}.nav{display:flex;align-items:stretch;list-style:none;margin-left:20px;}.nav ul{display:flex;align-items:stretch;}.button{margin-left:10px;&:first-child{margin:0;}}', ';', ';', ';'], theme.contentBackground, medium$2('\n    .in {\n      min-height: 70px;\n    }\n  '), large$3('\n    .in {\n      min-height: 70px;\n    }\n    .nav {\n      margin-left: 45px;\n    }\n  '), function (_ref) {
  var withTitle = _ref.withTitle;

  if (!withTitle) return '';
  return '\n      .logo {\n        padding-right: 40px;\n        border-right: 1px solid #e8e8e8;\n        padding-top: 6px;\n        padding-bottom: 8px;\n      }\n      .logo img:first-child {\n        margin-right: 10px;\n      }\n    ';
});

var DefaultProps$4 = {
  menuItems: []
};

var Header = function Header(_ref2) {
  var title = _ref2.title,
      menuItems = _ref2.menuItems,
      renderMenuItemLink = _ref2.renderMenuItemLink;
  return React.createElement(
    StyledHeader,
    { withTitle: Boolean(title) },
    React.createElement(
      'div',
      { className: 'in' },
      React.createElement(
        'div',
        { className: 'menu' },
        React.createElement(Logo$1, { compact: Boolean(title), renderLink: renderMenuItemLink }),
        title && React.createElement(
          'div',
          { className: 'title' },
          React.createElement(
            'h1',
            null,
            React.createElement(
              TypedText,
              { size: 'xlarge' },
              title,
              ' '
            )
          )
        ),
        menuItems.length > 0 && React.createElement(
          'div',
          { className: 'menu-items' },
          React.createElement(
            BreakPoint,
            { to: 'medium' },
            React.createElement(MenuPanel, { items: menuItems, renderLink: renderMenuItemLink })
          ),
          React.createElement(
            BreakPoint,
            { from: 'medium' },
            React.createElement(
              'nav',
              { className: 'nav' },
              React.createElement(
                'ul',
                null,
                menuItems.map(function (item, i) {
                  return React.createElement(MenuItem, {
                    key: i,
                    url: item[0],
                    label: item[1],
                    active: item[2],
                    renderLink: renderMenuItemLink
                  });
                })
              )
            )
          )
        )
      ),
      !title && React.createElement(
        BreakPoint,
        { from: 'medium' },
        React.createElement(
          'div',
          { className: 'buttons' },
          React.createElement(
            'div',
            { className: 'button' },
            React.createElement(
              'a',
              { href: 'https://alpha.aragon.one', target: '_blank' },
              React.createElement(
                Button,
                { mode: 'outline' },
                React.createElement(
                  BreakPoint,
                  { from: 'medium', to: 'large' },
                  'Web version'
                ),
                React.createElement(
                  BreakPoint,
                  { from: 'large' },
                  'Try the web version'
                )
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'button' },
            React.createElement(
              'a',
              {
                href: 'https://github.com/aragon/aragon/releases',
                target: '_blank'
              },
              React.createElement(
                Button,
                { mode: 'strong' },
                React.createElement(
                  BreakPoint,
                  { from: 'medium', to: 'large' },
                  'Aragon Core'
                ),
                React.createElement(
                  BreakPoint,
                  { from: 'large' },
                  'Download Aragon Core'
                )
              )
            )
          )
        )
      )
    )
  );
};

Header.defaultProps = DefaultProps$4;

var close$1 = "data:image/svg+xml,%3Csvg%20width%3D%2210%22%20height%3D%2210%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M10%201.014L6.014%205%2010%208.986%208.986%2010%205%206.014%201.014%2010%200%208.986%203.986%205%200%201.014%201.014%200%205%203.986%208.986%200z%22%20fill%3D%22%236D777B%22%20fill-rule%3D%22evenodd%22%20opacity%3D%22.7%22%2F%3E%3C%2Fsvg%3E";

var PANEL_WIDTH = 450;
var PANEL_OVERFLOW = PANEL_WIDTH * 0.2;
var PANEL_HIDE_RIGHT = -PANEL_WIDTH * 1.6;
var CONTENT_PADDING = 30;
var PANEL_INNER_WIDTH = PANEL_WIDTH - CONTENT_PADDING * 2;

var StyledSidePanel = styled.div.withConfig({
  displayName: 'SidePanel__StyledSidePanel'
})(['position:fixed;z-index:3;top:0;left:0;right:0;bottom:0;pointer-events:', ';'], function (_ref) {
  var opened = _ref.opened;
  return opened ? 'auto' : 'none';
});

var Overlay = styled.div.withConfig({
  displayName: 'SidePanel__Overlay'
})(['position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(68,81,89,0.65);pointer-events:', ';'], function (_ref2) {
  var opened = _ref2.opened;
  return opened ? 'auto' : 'none';
});

var StyledPanel = styled.aside.withConfig({
  displayName: 'SidePanel__StyledPanel'
})(['position:absolute;top:0;right:0;display:flex;flex-direction:column;width:', 'px;height:100vh;padding-right:', 'px;background:white;box-shadow:-2px 0 36px rgba(0,0,0,0.2);'], PANEL_WIDTH + PANEL_OVERFLOW, PANEL_OVERFLOW);

var StyledPanelHeader = styled.header.withConfig({
  displayName: 'SidePanel__StyledPanelHeader'
})(['position:relative;padding-top:15px;padding-left:', 'px;padding-right:20px;padding-bottom:15px;', ';'], CONTENT_PADDING, unselectable());

var StyledPanelScrollView = styled.div.withConfig({
  displayName: 'SidePanel__StyledPanelScrollView'
})(['overflow-y:auto;']);

var StyledPanelContent = styled.div.withConfig({
  displayName: 'SidePanel__StyledPanelContent'
})(['padding-right:', 'px;padding-left:', 'px;padding-bottom:', 'px;'], CONTENT_PADDING, CONTENT_PADDING, CONTENT_PADDING);

var StyledPanelCloseButton = styled.button.withConfig({
  displayName: 'SidePanel__StyledPanelCloseButton'
})(['', ' &{position:absolute;padding:20px;top:0;right:0;cursor:pointer;background:none;border:0;outline:0;&::-moz-focus-inner{border:0;}}'], StyledPanelHeader);

var motionStyles = function motionStyles(progress) {
  return {
    overlay: { opacity: progress },
    panel: { right: lerp(progress, PANEL_HIDE_RIGHT, -PANEL_OVERFLOW) + 'px' }
  };
};

var SidePanel = function (_React$Component) {
  inherits(SidePanel, _React$Component);

  function SidePanel() {
    var _ref3;

    var _temp, _this, _ret;

    classCallCheck(this, SidePanel);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref3 = SidePanel.__proto__ || Object.getPrototypeOf(SidePanel)).call.apply(_ref3, [this].concat(args))), _this), _this.handleClose = function () {
      if (!_this.props.blocking) {
        _this.props.onClose();
      }
    }, _this.handleEscape = function (event) {
      if (event.keyCode === 27 && _this.props.opened) {
        _this.handleClose();
      }
    }, _this.handleMotionRest = function () {
      _this.props.onTransitionEnd(_this.props.opened);
    }, _temp), possibleConstructorReturn(_this, _ret);
  }

  createClass(SidePanel, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      document.addEventListener('keydown', this.handleEscape, false);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      document.removeEventListener('keydown', this.handleEscape, false);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          children = _props.children,
          title = _props.title,
          opened = _props.opened,
          blocking = _props.blocking,
          publicUrl = _props.publicUrl;

      return React.createElement(
        reactMotion_1,
        {
          style: { progress: reactMotion_4(Number(opened), spring('slow')) },
          onRest: this.handleMotionRest
        },
        function (_ref4) {
          var progress = _ref4.progress;

          var styles = motionStyles(progress);
          return React.createElement(
            StyledSidePanel,
            { hidden: progress === 0, opened: opened },
            React.createElement(Overlay, {
              opened: opened,
              style: styles.overlay,
              onClick: _this2.handleClose
            }),
            React.createElement(
              StyledPanel,
              { style: styles.panel },
              React.createElement(
                StyledPanelHeader,
                null,
                React.createElement(
                  'h1',
                  null,
                  React.createElement(
                    TypedText,
                    { size: 'xxlarge' },
                    title
                  )
                ),
                !blocking && React.createElement(
                  StyledPanelCloseButton,
                  {
                    type: 'button',
                    onClick: _this2.handleClose
                  },
                  React.createElement('img', { src: prefixUrl(close$1, publicUrl), alt: 'Close' })
                )
              ),
              React.createElement(
                StyledPanelScrollView,
                null,
                React.createElement(
                  StyledPanelContent,
                  null,
                  children
                )
              )
            )
          );
        }
      );
    }
  }]);
  return SidePanel;
}(React.Component);

SidePanel.propTypes = {
  children: propTypes.node,
  title: propTypes.string.isRequired,
  opened: propTypes.bool,
  blocking: propTypes.bool,
  onClose: propTypes.func,
  publicUrl: propTypes.string.isRequired,
  onTransitionEnd: propTypes.func
};

SidePanel.defaultProps = {
  opened: true,
  blocking: false,
  onClose: function onClose() {},
  onTransitionEnd: function onTransitionEnd() {}
};

var WrappedSidePanel = getPublicUrl(SidePanel);

WrappedSidePanel.PANEL_WIDTH = PANEL_WIDTH;
WrappedSidePanel.PANEL_OVERFLOW = PANEL_OVERFLOW;
WrappedSidePanel.PANEL_HIDE_RIGHT = PANEL_HIDE_RIGHT;
WrappedSidePanel.PANEL_INNER_WIDTH = PANEL_INNER_WIDTH;
WrappedSidePanel.HORIZONTAL_PADDING = CONTENT_PADDING;

var SidePanelSeparator = styled.div.withConfig({
  displayName: 'SidePanelSeparator'
})(['width:calc(100% + ', 'px);margin:0 -', 'px;height:1px;background:', ';'], WrappedSidePanel.HORIZONTAL_PADDING * 2, WrappedSidePanel.HORIZONTAL_PADDING, theme.contentBorder);

var SidePanelSplit = function SidePanelSplit(_ref) {
  var children = _ref.children,
      props = objectWithoutProperties(_ref, ['children']);
  return React.createElement(
    Main$4,
    props,
    React.createElement(
      Part$1,
      null,
      children[0]
    ),
    React.createElement(
      Part$1,
      null,
      children[1]
    )
  );
};

var Main$4 = styled.div.withConfig({
  displayName: 'SidePanelSplit__Main'
})(['display:flex;width:calc(100% + ', 'px);margin:0 -', 'px;border:1px solid ', ';border-width:1px 0;'], WrappedSidePanel.HORIZONTAL_PADDING * 2, WrappedSidePanel.HORIZONTAL_PADDING, theme.contentBorder);

var Part$1 = styled.div.withConfig({
  displayName: 'SidePanelSplit__Part'
})(['width:50%;padding:20px ', 'px;&:first-child{border-right:1px solid ', ';}'], WrappedSidePanel.HORIZONTAL_PADDING, theme.contentBorder);

var RadioGroup = function RadioGroup(_ref) {
  var children = _ref.children,
      className = _ref.className,
      radioProps = objectWithoutProperties(_ref, ['children', 'className']);
  return React.createElement(
    'div',
    { className: className, role: 'radiogroup' },
    React.Children.map(children, function (child) {
      return React.cloneElement(child, _extends({}, radioProps));
    })
  );
};
RadioGroup.propTypes = {
  children: propTypes.node.isRequired,
  className: propTypes.string
};

var installedColorSpaces = [];
var undef = function (obj) {
        return typeof obj === 'undefined';
    };
var channelRegExp = /\s*(\.\d+|\d+(?:\.\d+)?)(%)?\s*/;
var percentageChannelRegExp = /\s*(\.\d+|100|\d?\d(?:\.\d+)?)%\s*/;
var alphaChannelRegExp = /\s*(\.\d+|\d+(?:\.\d+)?)\s*/;
var cssColorRegExp = new RegExp(
                         '^(rgb|hsl|hsv)a?' +
                         '\\(' +
                             channelRegExp.source + ',' +
                             channelRegExp.source + ',' +
                             channelRegExp.source +
                             '(?:,' + alphaChannelRegExp.source + ')?' +
                         '\\)$', 'i');

function color$1(obj) {
    if (Array.isArray(obj)) {
        if (typeof obj[0] === 'string' && typeof color$1[obj[0]] === 'function') {
            // Assumed array from .toJSON()
            return new color$1[obj[0]](obj.slice(1, obj.length));
        } else if (obj.length === 4) {
            // Assumed 4 element int RGB array from canvas with all channels [0;255]
            return new color$1.RGB(obj[0] / 255, obj[1] / 255, obj[2] / 255, obj[3] / 255);
        }
    } else if (typeof obj === 'string') {
        var lowerCased = obj.toLowerCase();
        if (color$1.namedColors[lowerCased]) {
            obj = '#' + color$1.namedColors[lowerCased];
        }
        if (lowerCased === 'transparent') {
            obj = 'rgba(0,0,0,0)';
        }
        // Test for CSS rgb(....) string
        var matchCssSyntax = obj.match(cssColorRegExp);
        if (matchCssSyntax) {
            var colorSpaceName = matchCssSyntax[1].toUpperCase(),
                alpha = undef(matchCssSyntax[8]) ? matchCssSyntax[8] : parseFloat(matchCssSyntax[8]),
                hasHue = colorSpaceName[0] === 'H',
                firstChannelDivisor = matchCssSyntax[3] ? 100 : (hasHue ? 360 : 255),
                secondChannelDivisor = (matchCssSyntax[5] || hasHue) ? 100 : 255,
                thirdChannelDivisor = (matchCssSyntax[7] || hasHue) ? 100 : 255;
            if (undef(color$1[colorSpaceName])) {
                throw new Error('color.' + colorSpaceName + ' is not installed.');
            }
            return new color$1[colorSpaceName](
                parseFloat(matchCssSyntax[2]) / firstChannelDivisor,
                parseFloat(matchCssSyntax[4]) / secondChannelDivisor,
                parseFloat(matchCssSyntax[6]) / thirdChannelDivisor,
                alpha
            );
        }
        // Assume hex syntax
        if (obj.length < 6) {
            // Allow CSS shorthand
            obj = obj.replace(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i, '$1$1$2$2$3$3');
        }
        // Split obj into red, green, and blue components
        var hexMatch = obj.match(/^#?([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])$/i);
        if (hexMatch) {
            return new color$1.RGB(
                parseInt(hexMatch[1], 16) / 255,
                parseInt(hexMatch[2], 16) / 255,
                parseInt(hexMatch[3], 16) / 255
            );
        }

        // No match so far. Lets try the less likely ones
        if (color$1.CMYK) {
            var cmykMatch = obj.match(new RegExp(
                             '^cmyk' +
                             '\\(' +
                                 percentageChannelRegExp.source + ',' +
                                 percentageChannelRegExp.source + ',' +
                                 percentageChannelRegExp.source + ',' +
                                 percentageChannelRegExp.source +
                             '\\)$', 'i'));
            if (cmykMatch) {
                return new color$1.CMYK(
                    parseFloat(cmykMatch[1]) / 100,
                    parseFloat(cmykMatch[2]) / 100,
                    parseFloat(cmykMatch[3]) / 100,
                    parseFloat(cmykMatch[4]) / 100
                );
            }
        }
    } else if (typeof obj === 'object' && obj.isColor) {
        return obj;
    }
    return false;
}

color$1.namedColors = {};

color$1.installColorSpace = function (colorSpaceName, propertyNames, config) {
    color$1[colorSpaceName] = function (a1) { // ...
        var args = Array.isArray(a1) ? a1 : arguments;
        propertyNames.forEach(function (propertyName, i) {
            var propertyValue = args[i];
            if (propertyName === 'alpha') {
                this._alpha = (isNaN(propertyValue) || propertyValue > 1) ? 1 : (propertyValue < 0 ? 0 : propertyValue);
            } else {
                if (isNaN(propertyValue)) {
                    throw new Error('[' + colorSpaceName + ']: Invalid color: (' + propertyNames.join(',') + ')');
                }
                if (propertyName === 'hue') {
                    this._hue = propertyValue < 0 ? propertyValue - Math.floor(propertyValue) : propertyValue % 1;
                } else {
                    this['_' + propertyName] = propertyValue < 0 ? 0 : (propertyValue > 1 ? 1 : propertyValue);
                }
            }
        }, this);
    };
    color$1[colorSpaceName].propertyNames = propertyNames;

    var prototype = color$1[colorSpaceName].prototype;

    ['valueOf', 'hex', 'hexa', 'css', 'cssa'].forEach(function (methodName) {
        prototype[methodName] = prototype[methodName] || (colorSpaceName === 'RGB' ? prototype.hex : function () {
            return this.rgb()[methodName]();
        });
    });

    prototype.isColor = true;

    prototype.equals = function (otherColor, epsilon) {
        if (undef(epsilon)) {
            epsilon = 1e-10;
        }

        otherColor = otherColor[colorSpaceName.toLowerCase()]();

        for (var i = 0; i < propertyNames.length; i = i + 1) {
            if (Math.abs(this['_' + propertyNames[i]] - otherColor['_' + propertyNames[i]]) > epsilon) {
                return false;
            }
        }

        return true;
    };

    prototype.toJSON = function () {
        return [colorSpaceName].concat(propertyNames.map(function (propertyName) {
            return this['_' + propertyName];
        }, this));
    };

    for (var propertyName in config) {
        if (config.hasOwnProperty(propertyName)) {
            var matchFromColorSpace = propertyName.match(/^from(.*)$/);
            if (matchFromColorSpace) {
                color$1[matchFromColorSpace[1].toUpperCase()].prototype[colorSpaceName.toLowerCase()] = config[propertyName];
            } else {
                prototype[propertyName] = config[propertyName];
            }
        }
    }

    // It is pretty easy to implement the conversion to the same color space:
    prototype[colorSpaceName.toLowerCase()] = function () {
        return this;
    };
    prototype.toString = function () {
        return '[' + colorSpaceName + ' ' + propertyNames.map(function (propertyName) {
            return this['_' + propertyName];
        }, this).join(', ') + ']';
    };

    // Generate getters and setters
    propertyNames.forEach(function (propertyName) {
        var shortName = propertyName === 'black' ? 'k' : propertyName.charAt(0);
        prototype[propertyName] = prototype[shortName] = function (value, isDelta) {
            // Simple getter mode: color.red()
            if (typeof value === 'undefined') {
                return this['_' + propertyName];
            } else if (isDelta) {
                // Adjuster: color.red(+.2, true)
                return new this.constructor(propertyNames.map(function (otherPropertyName) {
                    return this['_' + otherPropertyName] + (propertyName === otherPropertyName ? value : 0);
                }, this));
            } else {
                // Setter: color.red(.2);
                return new this.constructor(propertyNames.map(function (otherPropertyName) {
                    return (propertyName === otherPropertyName) ? value : this['_' + otherPropertyName];
                }, this));
            }
        };
    });

    function installForeignMethods(targetColorSpaceName, sourceColorSpaceName) {
        var obj = {};
        obj[sourceColorSpaceName.toLowerCase()] = function () {
            return this.rgb()[sourceColorSpaceName.toLowerCase()]();
        };
        color$1[sourceColorSpaceName].propertyNames.forEach(function (propertyName) {
            var shortName = propertyName === 'black' ? 'k' : propertyName.charAt(0);
            obj[propertyName] = obj[shortName] = function (value, isDelta) {
                return this[sourceColorSpaceName.toLowerCase()]()[propertyName](value, isDelta);
            };
        });
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop) && color$1[targetColorSpaceName].prototype[prop] === undefined) {
                color$1[targetColorSpaceName].prototype[prop] = obj[prop];
            }
        }
    }

    installedColorSpaces.forEach(function (otherColorSpaceName) {
        installForeignMethods(colorSpaceName, otherColorSpaceName);
        installForeignMethods(otherColorSpaceName, colorSpaceName);
    });

    installedColorSpaces.push(colorSpaceName);
    return color$1;
};

color$1.pluginList = [];

color$1.use = function (plugin) {
    if (color$1.pluginList.indexOf(plugin) === -1) {
        this.pluginList.push(plugin);
        plugin(color$1);
    }
    return color$1;
};

color$1.installMethod = function (name, fn) {
    installedColorSpaces.forEach(function (colorSpace) {
        color$1[colorSpace].prototype[name] = fn;
    });
    return this;
};

color$1.installColorSpace('RGB', ['red', 'green', 'blue', 'alpha'], {
    hex: function () {
        var hexString = (Math.round(255 * this._red) * 0x10000 + Math.round(255 * this._green) * 0x100 + Math.round(255 * this._blue)).toString(16);
        return '#' + ('00000'.substr(0, 6 - hexString.length)) + hexString;
    },

    hexa: function () {
        var alphaString = Math.round(this._alpha * 255).toString(16);
        return '#' + '00'.substr(0, 2 - alphaString.length) + alphaString + this.hex().substr(1, 6);
    },

    css: function () {
        return 'rgb(' + Math.round(255 * this._red) + ',' + Math.round(255 * this._green) + ',' + Math.round(255 * this._blue) + ')';
    },

    cssa: function () {
        return 'rgba(' + Math.round(255 * this._red) + ',' + Math.round(255 * this._green) + ',' + Math.round(255 * this._blue) + ',' + this._alpha + ')';
    }
});

var color_1 = color$1;

var XYZ = function XYZ(color) {
    color.installColorSpace('XYZ', ['x', 'y', 'z', 'alpha'], {
        fromRgb: function () {
            // http://www.easyrgb.com/index.php?X=MATH&H=02#text2
            var convert = function (channel) {
                    return channel > 0.04045 ?
                        Math.pow((channel + 0.055) / 1.055, 2.4) :
                        channel / 12.92;
                },
                r = convert(this._red),
                g = convert(this._green),
                b = convert(this._blue);

            // Reference white point sRGB D65:
            // http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
            return new color.XYZ(
                r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
                r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
                r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
                this._alpha
            );
        },

        rgb: function () {
            // http://www.easyrgb.com/index.php?X=MATH&H=01#text1
            var x = this._x,
                y = this._y,
                z = this._z,
                convert = function (channel) {
                    return channel > 0.0031308 ?
                        1.055 * Math.pow(channel, 1 / 2.4) - 0.055 :
                        12.92 * channel;
                };

            // Reference white point sRGB D65:
            // http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
            return new color.RGB(
                convert(x *  3.2404542 + y * -1.5371385 + z * -0.4985314),
                convert(x * -0.9692660 + y *  1.8760108 + z *  0.0415560),
                convert(x *  0.0556434 + y * -0.2040259 + z *  1.0572252),
                this._alpha
            );
        },

        lab: function () {
            // http://www.easyrgb.com/index.php?X=MATH&H=07#text7
            var convert = function (channel) {
                    return channel > 0.008856 ?
                        Math.pow(channel, 1 / 3) :
                        7.787037 * channel + 4 / 29;
                },
                x = convert(this._x /  95.047),
                y = convert(this._y / 100.000),
                z = convert(this._z / 108.883);

            return new color.LAB(
                (116 * y) - 16,
                500 * (x - y),
                200 * (y - z),
                this._alpha
            );
        }
    });
};

var LAB = function LAB(color) {
    color.use(XYZ);

    color.installColorSpace('LAB', ['l', 'a', 'b', 'alpha'], {
        fromRgb: function () {
            return this.xyz().lab();
        },

        rgb: function () {
            return this.xyz().rgb();
        },

        xyz: function () {
            // http://www.easyrgb.com/index.php?X=MATH&H=08#text8
            var convert = function (channel) {
                    var pow = Math.pow(channel, 3);
                    return pow > 0.008856 ?
                        pow :
                        (channel - 16 / 116) / 7.87;
                },
                y = (this._l + 16) / 116,
                x = this._a / 500 + y,
                z = y - this._b / 200;

            return new color.XYZ(
                convert(x) *  95.047,
                convert(y) * 100.000,
                convert(z) * 108.883,
                this._alpha
            );
        }
    });
};

var HSV = function HSV(color) {
    color.installColorSpace('HSV', ['hue', 'saturation', 'value', 'alpha'], {
        rgb: function () {
            var hue = this._hue,
                saturation = this._saturation,
                value = this._value,
                i = Math.min(5, Math.floor(hue * 6)),
                f = hue * 6 - i,
                p = value * (1 - saturation),
                q = value * (1 - f * saturation),
                t = value * (1 - (1 - f) * saturation),
                red,
                green,
                blue;
            switch (i) {
            case 0:
                red = value;
                green = t;
                blue = p;
                break;
            case 1:
                red = q;
                green = value;
                blue = p;
                break;
            case 2:
                red = p;
                green = value;
                blue = t;
                break;
            case 3:
                red = p;
                green = q;
                blue = value;
                break;
            case 4:
                red = t;
                green = p;
                blue = value;
                break;
            case 5:
                red = value;
                green = p;
                blue = q;
                break;
            }
            return new color.RGB(red, green, blue, this._alpha);
        },

        hsl: function () {
            var l = (2 - this._saturation) * this._value,
                sv = this._saturation * this._value,
                svDivisor = l <= 1 ? l : (2 - l),
                saturation;

            // Avoid division by zero when lightness approaches zero:
            if (svDivisor < 1e-9) {
                saturation = 0;
            } else {
                saturation = sv / svDivisor;
            }
            return new color.HSL(this._hue, saturation, l / 2, this._alpha);
        },

        fromRgb: function () { // Becomes one.color.RGB.prototype.hsv
            var red = this._red,
                green = this._green,
                blue = this._blue,
                max = Math.max(red, green, blue),
                min = Math.min(red, green, blue),
                delta = max - min,
                hue,
                saturation = (max === 0) ? 0 : (delta / max),
                value = max;
            if (delta === 0) {
                hue = 0;
            } else {
                switch (max) {
                case red:
                    hue = (green - blue) / delta / 6 + (green < blue ? 1 : 0);
                    break;
                case green:
                    hue = (blue - red) / delta / 6 + 1 / 3;
                    break;
                case blue:
                    hue = (red - green) / delta / 6 + 2 / 3;
                    break;
                }
            }
            return new color.HSV(hue, saturation, value, this._alpha);
        }
    });
};

var HSL = function HSL(color) {
    color.use(HSV);

    color.installColorSpace('HSL', ['hue', 'saturation', 'lightness', 'alpha'], {
        hsv: function () {
            // Algorithm adapted from http://wiki.secondlife.com/wiki/Color_conversion_scripts
            var l = this._lightness * 2,
                s = this._saturation * ((l <= 1) ? l : 2 - l),
                saturation;

            // Avoid division by zero when l + s is very small (approaching black):
            if (l + s < 1e-9) {
                saturation = 0;
            } else {
                saturation = (2 * s) / (l + s);
            }

            return new color.HSV(this._hue, saturation, (l + s) / 2, this._alpha);
        },

        rgb: function () {
            return this.hsv().rgb();
        },

        fromRgb: function () { // Becomes one.color.RGB.prototype.hsv
            return this.hsv().hsl();
        }
    });
};

var CMYK = function CMYK(color) {
    color.installColorSpace('CMYK', ['cyan', 'magenta', 'yellow', 'black', 'alpha'], {
        rgb: function () {
            return new color.RGB((1 - this._cyan * (1 - this._black) - this._black),
                                     (1 - this._magenta * (1 - this._black) - this._black),
                                     (1 - this._yellow * (1 - this._black) - this._black),
                                     this._alpha);
        },

        fromRgb: function () { // Becomes one.color.RGB.prototype.cmyk
            // Adapted from http://www.javascripter.net/faq/rgb2cmyk.htm
            var red = this._red,
                green = this._green,
                blue = this._blue,
                cyan = 1 - red,
                magenta = 1 - green,
                yellow = 1 - blue,
                black = 1;
            if (red || green || blue) {
                black = Math.min(cyan, Math.min(magenta, yellow));
                cyan = (cyan - black) / (1 - black);
                magenta = (magenta - black) / (1 - black);
                yellow = (yellow - black) / (1 - black);
            } else {
                black = 1;
            }
            return new color.CMYK(cyan, magenta, yellow, black, this._alpha);
        }
    });
};

var namedColors = function namedColors(color) {
    color.namedColors = {
        aliceblue: 'f0f8ff',
        antiquewhite: 'faebd7',
        aqua: '0ff',
        aquamarine: '7fffd4',
        azure: 'f0ffff',
        beige: 'f5f5dc',
        bisque: 'ffe4c4',
        black: '000',
        blanchedalmond: 'ffebcd',
        blue: '00f',
        blueviolet: '8a2be2',
        brown: 'a52a2a',
        burlywood: 'deb887',
        cadetblue: '5f9ea0',
        chartreuse: '7fff00',
        chocolate: 'd2691e',
        coral: 'ff7f50',
        cornflowerblue: '6495ed',
        cornsilk: 'fff8dc',
        crimson: 'dc143c',
        cyan: '0ff',
        darkblue: '00008b',
        darkcyan: '008b8b',
        darkgoldenrod: 'b8860b',
        darkgray: 'a9a9a9',
        darkgrey: 'a9a9a9',
        darkgreen: '006400',
        darkkhaki: 'bdb76b',
        darkmagenta: '8b008b',
        darkolivegreen: '556b2f',
        darkorange: 'ff8c00',
        darkorchid: '9932cc',
        darkred: '8b0000',
        darksalmon: 'e9967a',
        darkseagreen: '8fbc8f',
        darkslateblue: '483d8b',
        darkslategray: '2f4f4f',
        darkslategrey: '2f4f4f',
        darkturquoise: '00ced1',
        darkviolet: '9400d3',
        deeppink: 'ff1493',
        deepskyblue: '00bfff',
        dimgray: '696969',
        dimgrey: '696969',
        dodgerblue: '1e90ff',
        firebrick: 'b22222',
        floralwhite: 'fffaf0',
        forestgreen: '228b22',
        fuchsia: 'f0f',
        gainsboro: 'dcdcdc',
        ghostwhite: 'f8f8ff',
        gold: 'ffd700',
        goldenrod: 'daa520',
        gray: '808080',
        grey: '808080',
        green: '008000',
        greenyellow: 'adff2f',
        honeydew: 'f0fff0',
        hotpink: 'ff69b4',
        indianred: 'cd5c5c',
        indigo: '4b0082',
        ivory: 'fffff0',
        khaki: 'f0e68c',
        lavender: 'e6e6fa',
        lavenderblush: 'fff0f5',
        lawngreen: '7cfc00',
        lemonchiffon: 'fffacd',
        lightblue: 'add8e6',
        lightcoral: 'f08080',
        lightcyan: 'e0ffff',
        lightgoldenrodyellow: 'fafad2',
        lightgray: 'd3d3d3',
        lightgrey: 'd3d3d3',
        lightgreen: '90ee90',
        lightpink: 'ffb6c1',
        lightsalmon: 'ffa07a',
        lightseagreen: '20b2aa',
        lightskyblue: '87cefa',
        lightslategray: '789',
        lightslategrey: '789',
        lightsteelblue: 'b0c4de',
        lightyellow: 'ffffe0',
        lime: '0f0',
        limegreen: '32cd32',
        linen: 'faf0e6',
        magenta: 'f0f',
        maroon: '800000',
        mediumaquamarine: '66cdaa',
        mediumblue: '0000cd',
        mediumorchid: 'ba55d3',
        mediumpurple: '9370d8',
        mediumseagreen: '3cb371',
        mediumslateblue: '7b68ee',
        mediumspringgreen: '00fa9a',
        mediumturquoise: '48d1cc',
        mediumvioletred: 'c71585',
        midnightblue: '191970',
        mintcream: 'f5fffa',
        mistyrose: 'ffe4e1',
        moccasin: 'ffe4b5',
        navajowhite: 'ffdead',
        navy: '000080',
        oldlace: 'fdf5e6',
        olive: '808000',
        olivedrab: '6b8e23',
        orange: 'ffa500',
        orangered: 'ff4500',
        orchid: 'da70d6',
        palegoldenrod: 'eee8aa',
        palegreen: '98fb98',
        paleturquoise: 'afeeee',
        palevioletred: 'd87093',
        papayawhip: 'ffefd5',
        peachpuff: 'ffdab9',
        peru: 'cd853f',
        pink: 'ffc0cb',
        plum: 'dda0dd',
        powderblue: 'b0e0e6',
        purple: '800080',
        rebeccapurple: '639',
        red: 'f00',
        rosybrown: 'bc8f8f',
        royalblue: '4169e1',
        saddlebrown: '8b4513',
        salmon: 'fa8072',
        sandybrown: 'f4a460',
        seagreen: '2e8b57',
        seashell: 'fff5ee',
        sienna: 'a0522d',
        silver: 'c0c0c0',
        skyblue: '87ceeb',
        slateblue: '6a5acd',
        slategray: '708090',
        slategrey: '708090',
        snow: 'fffafa',
        springgreen: '00ff7f',
        steelblue: '4682b4',
        tan: 'd2b48c',
        teal: '008080',
        thistle: 'd8bfd8',
        tomato: 'ff6347',
        turquoise: '40e0d0',
        violet: 'ee82ee',
        wheat: 'f5deb3',
        white: 'fff',
        whitesmoke: 'f5f5f5',
        yellow: 'ff0',
        yellowgreen: '9acd32'
    };
};

var clearer = function clearer(color) {
    color.installMethod('clearer', function (amount) {
        return this.alpha(isNaN(amount) ? -0.1 : -amount, true);
    });
};

var darken = function darken(color) {
    color.use(HSL);

    color.installMethod('darken', function (amount) {
        return this.lightness(isNaN(amount) ? -0.1 : -amount, true);
    });
};

var desaturate = function desaturate(color) {
    color.use(HSL);

    color.installMethod('desaturate', function (amount) {
        return this.saturation(isNaN(amount) ? -0.1 : -amount, true);
    });
};

var grayscale = function grayscale(color) {
    function gs () {
        /*jslint strict:false*/
        var rgb = this.rgb(),
            val = rgb._red * 0.3 + rgb._green * 0.59 + rgb._blue * 0.11;

        return new color.RGB(val, val, val, rgb._alpha);
    }

    color.installMethod('greyscale', gs).installMethod('grayscale', gs);
};

var lighten = function lighten(color) {
    color.use(HSL);

    color.installMethod('lighten', function (amount) {
        return this.lightness(isNaN(amount) ? 0.1 : amount, true);
    });
};

var mix = function mix(color) {
    color.installMethod('mix', function (otherColor, weight) {
        otherColor = color(otherColor).rgb();
        weight = 1 - (isNaN(weight) ? 0.5 : weight);

        var w = weight * 2 - 1,
            a = this._alpha - otherColor._alpha,
            weight1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2,
            weight2 = 1 - weight1,
            rgb = this.rgb();

        return new color.RGB(
            rgb._red * weight1 + otherColor._red * weight2,
            rgb._green * weight1 + otherColor._green * weight2,
            rgb._blue * weight1 + otherColor._blue * weight2,
            rgb._alpha * weight + otherColor._alpha * (1 - weight)
        );
    });
};

var negate = function negate(color) {
    color.installMethod('negate', function () {
        var rgb = this.rgb();
        return new color.RGB(1 - rgb._red, 1 - rgb._green, 1 - rgb._blue, this._alpha);
    });
};

var opaquer = function opaquer(color) {
    color.installMethod('opaquer', function (amount) {
        return this.alpha(isNaN(amount) ? 0.1 : amount, true);
    });
};

var rotate = function rotate(color) {
    color.use(HSL);

    color.installMethod('rotate', function (degrees) {
        return this.hue((degrees || 0) / 360, true);
    });
};

var saturate = function saturate(color) {
    color.use(HSL);

    color.installMethod('saturate', function (amount) {
        return this.saturation(isNaN(amount) ? 0.1 : amount, true);
    });
};

// Adapted from http://gimp.sourcearchive.com/documentation/2.6.6-1ubuntu1/color-to-alpha_8c-source.html
// toAlpha returns a color where the values of the argument have been converted to alpha
var toAlpha = function toAlpha(color) {
    color.installMethod('toAlpha', function (color) {
        var me = this.rgb(),
            other = color(color).rgb(),
            epsilon = 1e-10,
            a = new color.RGB(0, 0, 0, me._alpha),
            channels = ['_red', '_green', '_blue'];

        channels.forEach(function (channel) {
            if (me[channel] < epsilon) {
                a[channel] = me[channel];
            } else if (me[channel] > other[channel]) {
                a[channel] = (me[channel] - other[channel]) / (1 - other[channel]);
            } else if (me[channel] > other[channel]) {
                a[channel] = (other[channel] - me[channel]) / other[channel];
            } else {
                a[channel] = 0;
            }
        });

        if (a._red > a._green) {
            if (a._red > a._blue) {
                me._alpha = a._red;
            } else {
                me._alpha = a._blue;
            }
        } else if (a._green > a._blue) {
            me._alpha = a._green;
        } else {
            me._alpha = a._blue;
        }

        if (me._alpha < epsilon) {
            return me;
        }

        channels.forEach(function (channel) {
            me[channel] = (me[channel] - other[channel]) / me._alpha + other[channel];
        });
        me._alpha *= a._alpha;

        return me;
    });
};

var onecolor = color_1
    .use(XYZ)
    .use(LAB)
    .use(HSV)
    .use(HSL)
    .use(CMYK)

    // Convenience functions
    .use(namedColors)
    .use(clearer)
    .use(darken)
    .use(desaturate)
    .use(grayscale)
    .use(lighten)
    .use(mix)
    .use(negate)
    .use(opaquer)
    .use(rotate)
    .use(saturate)
    .use(toAlpha);

var contentBorder$2 = theme.contentBorder;

var labelBoxBorder = onecolor(colors.Sea['Light Sea']);

var RadioListItem = function (_React$Component) {
  inherits(RadioListItem, _React$Component);

  function RadioListItem() {
    var _ref;

    var _temp, _this, _ret;

    classCallCheck(this, RadioListItem);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = RadioListItem.__proto__ || Object.getPrototypeOf(RadioListItem)).call.apply(_ref, [this].concat(args))), _this), _this.handleOnChange = function (event) {
      var _this$props = _this.props,
          index = _this$props.index,
          onChange = _this$props.onChange,
          onSelect = _this$props.onSelect;

      onSelect(index);
      onChange(event);
    }, _temp), possibleConstructorReturn(_this, _ret);
  }

  createClass(RadioListItem, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          className = _props.className,
          description = _props.description,
          selected = _props.selected,
          title = _props.title,
          ignoredIndex = _props.index,
          ignoredOnChange = _props.onChange,
          ignoredOnSelect = _props.onSelect,
          radioProps = objectWithoutProperties(_props, ['className', 'description', 'selected', 'title', 'index', 'onChange', 'onSelect']);

      return React.createElement(
        Label$1,
        { className: className },
        React.createElement(Radio, _extends({
          checked: selected,
          onChange: this.handleOnChange
        }, radioProps)),
        React.createElement(
          LabelBox,
          { selected: selected },
          React.createElement(
            Title$3,
            null,
            title
          ),
          React.createElement(
            Description$1,
            null,
            description
          )
        )
      );
    }
  }]);
  return RadioListItem;
}(React.Component);

// Utility styles from RadioButton


RadioListItem.propTypes = {
  description: propTypes.node.isRequired,
  index: propTypes.number.isRequired,
  title: propTypes.node.isRequired,

  className: propTypes.string,
  onChange: propTypes.func,
  onSelect: propTypes.func,
  selected: propTypes.bool
};
RadioListItem.defaultProps = {
  // By default, prevent the default change event from bubbling up
  onChange: function onChange(event) {
    event.stopPropagation();
  },
  onSelect: function onSelect() {}
};
var radioDimmed$1 = RadioButton.css.dimmed;

// Styled components

var Label$1 = styled.label.withConfig({
  displayName: 'RadioListItem__Label'
})(['display:flex;&:not(:first-child){margin-top:10px;}&:hover ', ':not(:checked){', ';}', ';'], RadioButton, radioDimmed$1, unselectable());

var LabelBox = styled.div.withConfig({
  displayName: 'RadioListItem__LabelBox'
})(['flex-grow:1;margin-left:12px;padding:12px 12px;border:1px ', ' solid;border-radius:3px;transition:border 200ms linear;cursor:pointer;&:focus,&:hover,', ':focus ~ &,', ':hover ~ &{border-color:', ';}', ':checked ~ &{border-color:', ';}'], contentBorder$2, RadioButton, RadioButton, labelBoxBorder.alpha(0.35).cssa(), RadioButton, labelBoxBorder.alpha(0.7).cssa());

var Title$3 = styled(TypedText).attrs({
  weight: 'bold'
}).withConfig({
  displayName: 'RadioListItem__Title'
})(['']);

var Description$1 = styled(TypedText.Block).withConfig({
  displayName: 'RadioListItem__Description'
})(['margin-top:5px;']);

var Radio = styled(RadioButton).withConfig({
  displayName: 'RadioListItem__Radio'
})(['flex-shrink:0;margin-top:16px;']);

var RadioList = function (_React$Component) {
  inherits(RadioList, _React$Component);

  function RadioList() {
    classCallCheck(this, RadioList);
    return possibleConstructorReturn(this, (RadioList.__proto__ || Object.getPrototypeOf(RadioList)).apply(this, arguments));
  }

  createClass(RadioList, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          description = _props.description,
          items = _props.items,
          selected = _props.selected,
          title = _props.title,
          props = objectWithoutProperties(_props, ['description', 'items', 'selected', 'title']);

      return React.createElement(
        'div',
        null,
        title && React.createElement(
          Title$2,
          null,
          React.createElement(
            TypedText,
            { size: 'large', weight: 'bold' },
            title
          )
        ),
        description && React.createElement(
          Description,
          null,
          description
        ),
        React.createElement(
          Group,
          props,
          items.map(function (_ref, i) {
            var description = _ref.description,
                title = _ref.title,
                value = _ref.value;
            return React.createElement(RadioListItem, {
              key: i,
              index: i,
              selected: i === selected,
              description: description,
              title: title,
              value: value
            });
          })
        )
      );
    }
  }]);
  return RadioList;
}(React.Component);

RadioList.propTypes = {
  description: propTypes.node,
  items: propTypes.arrayOf(propTypes.shape({
    description: propTypes.node.isRequired,
    title: propTypes.node.isRequired,
    value: propTypes.string
  })),
  selected: function selected(_ref2, _, componentName) {
    var items = _ref2.items,
        _selected = _ref2.selected;

    if (!Number.isInteger(_selected) || _selected >= items.length) {
      throw new Error('Invalid prop `selected` supplied to `' + componentName + '`. ' + '`selected` must be an integer less than the length of `items`. ' + ('Given ' + _selected + ' instead.'));
    }
  },
  title: propTypes.node
};
RadioList.defaultProps = {
  items: [],
  selected: 0
};


var Title$2 = styled.h2.withConfig({
  displayName: 'RadioList__Title'
})(['margin-bottom:5px;']);

var Description = styled(TypedText.Block).withConfig({
  displayName: 'RadioList__Description'
})(['margin-bottom:18px;']);

var Group = styled(RadioGroup).withConfig({
  displayName: 'RadioList__Group'
})(['display:flex;flex-direction:column;']);

var StyledTable = styled.table.withConfig({
  displayName: 'Table__StyledTable'
})(['width:100%;border-spacing:0;']);

var Table = function Table(_ref) {
  var header = _ref.header,
      children = _ref.children,
      props = objectWithoutProperties(_ref, ['header', 'children']);
  return React.createElement(
    StyledTable,
    props,
    header && React.createElement(
      'thead',
      null,
      header
    ),
    React.createElement(
      'tbody',
      null,
      children
    )
  );
};

var StyledTableRow = styled.tr.withConfig({
  displayName: 'TableRow__StyledTableRow'
})(['']);

var contentBackground$2 = theme.contentBackground;
var contentBorder$3 = theme.contentBorder;


var StyledTableCell = styled.td.withConfig({
  displayName: 'TableCell__StyledTableCell'
})(['padding:20px;background:', ';border-bottom:1px solid ', ';text-align:', ';&:first-child{border-left:1px solid ', ';}&:last-child{border-right:1px solid ', ';}', ':first-child &{border-top:1px solid ', ';}', ':first-child &:first-child{border-top-left-radius:3px;}', ':first-child &:last-child{border-top-right-radius:3px;}', ':last-child &:first-child{border-bottom-left-radius:3px;}', ':last-child &:last-child{border-bottom-right-radius:3px;}'], contentBackground$2, contentBorder$3, function (_ref) {
  var align = _ref.align;
  return align;
}, contentBorder$3, contentBorder$3, StyledTableRow, contentBorder$3, StyledTableRow, StyledTableRow, StyledTableRow, StyledTableRow);

var StyledTableCellContent = styled.div.withConfig({
  displayName: 'TableCell__StyledTableCellContent'
})(['display:flex;align-items:center;justify-content:', ';'], function (_ref2) {
  var align = _ref2.align;
  return align === 'right' ? 'flex-end' : 'space-between';
});

var DefaultProps$7 = {
  align: 'left',
  contentContainer: StyledTableCellContent
};

var TableCell = function TableCell(_ref3) {
  var children = _ref3.children,
      Container = _ref3.contentContainer,
      align = _ref3.align,
      props = objectWithoutProperties(_ref3, ['children', 'contentContainer', 'align']);
  return React.createElement(
    StyledTableCell,
    _extends({ align: align }, props),
    React.createElement(
      Container,
      { align: align },
      children
    )
  );
};

TableCell.defaultProps = DefaultProps$7;

var StyledTableHeader = styled.th.withConfig({
  displayName: 'TableHeader__StyledTableHeader'
})(['padding:0;padding-left:', ';padding-right:', ';line-height:30px;font-weight:normal;text-align:', ';white-space:nowrap;'], function (_ref) {
  var align = _ref.align;
  return align === 'left' ? '21px' : '0';
}, function (_ref2) {
  var align = _ref2.align;
  return align === 'right' ? '21px' : '0';
}, function (_ref3) {
  var align = _ref3.align;
  return align;
});

var DefaultProps$8 = {
  align: 'left'
};

var TableHeader = function TableHeader(_ref4) {
  var title = _ref4.title,
      align = _ref4.align,
      props = objectWithoutProperties(_ref4, ['title', 'align']);
  return React.createElement(
    StyledTableHeader,
    _extends({ align: align }, props),
    React.createElement(
      TypedText.Block,
      { color: theme.textSecondary, smallcaps: true },
      title
    )
  );
};

TableHeader.defaultProps = DefaultProps$8;

var StyledCard = styled.div.withConfig({
  displayName: 'Card__StyledCard'
})(['width:', ';height:', ';background:', ';border:1px solid ', ';border-radius:3px;'], function (_ref) {
  var width = _ref.width;
  return width || '282px';
}, function (_ref2) {
  var height = _ref2.height;
  return height || '322px';
}, theme.contentBackground, theme.contentBorder);

var _templateObject$2 = taggedTemplateLiteral(['\n  display: flex;\n  padding: 40px 60px;\n  align-items: center;\n  text-align: center;\n  section {\n    padding-top: 20px;\n  }\n'], ['\n  display: flex;\n  padding: 40px 60px;\n  align-items: center;\n  text-align: center;\n  section {\n    padding-top: 20px;\n  }\n']);

var StyledCard$1 = StyledCard.extend(_templateObject$2);

var StyledHeading = styled.h1.withConfig({
  displayName: 'EmptyStateCard__StyledHeading'
})(['margin:20px 0 5px;']);

// $FlowFixMe
var StyledActionButton = styled(Button).withConfig({
  displayName: 'EmptyStateCard__StyledActionButton'
})(['width:150px;margin-top:20px;']);

var DefaultProps$9 = {
  actionButton: StyledActionButton,
  title: 'Nothing here.'
};

var EmptyStateCard = function EmptyStateCard(_ref) {
  var actionText = _ref.actionText,
      onActivate = _ref.onActivate,
      text = _ref.text,
      title = _ref.title,
      ActionButton = _ref.actionButton,
      Icon = _ref.icon,
      props = objectWithoutProperties(_ref, ['actionText', 'onActivate', 'text', 'title', 'actionButton', 'icon']);
  return React.createElement(
    StyledCard$1,
    props,
    React.createElement(
      'section',
      null,
      React.createElement(Icon, null),
      React.createElement(
        StyledHeading,
        null,
        React.createElement(
          TypedText,
          { color: theme.accent, weight: 'bold', size: 'large' },
          title
        )
      ),
      React.createElement(
        TypedText.Block,
        null,
        text
      ),
      React.createElement(
        ActionButton,
        { mode: 'strong', onClick: onActivate },
        actionText
      )
    )
  );
};

EmptyStateCard.defaultProps = DefaultProps$9;

var chevronSvg = "data:image/svg+xml,%3Csvg%20width%3D%227%22%20height%3D%2212%22%20viewBox%3D%220%200%207%2012%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M.446%2012a.512.512%200%200%201-.172-.03.422.422%200%200%201-.146-.087A.37.37%200%200%201%200%2011.6a.37.37%200%200%201%20.128-.281l5.826-5.361L.217.692A.376.376%200%200%201%20.089.405.378.378%200%200%201%20.217.117.444.444%200%200%201%20.529%200c.123%200%20.228.04.313.117l6.03%205.56A.37.37%200%200%201%207%205.96a.37.37%200%200%201-.128.281l-6.12%205.643A.477.477%200%200%201%20.446%2012z%22%20fill%3D%22%2300CBE6%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E";

var StyledAppBar = styled.div.withConfig({
  displayName: 'AppBar__StyledAppBar'
})(['display:flex;align-items:center;justify-content:flex-start;width:100%;height:64px;background:', ';border-bottom:1px solid ', ';', ';'], theme.contentBackground, theme.contentBorder, unselectable());

var StyledAppBarStart = styled.div.withConfig({
  displayName: 'AppBar__StyledAppBarStart'
})(['display:flex;align-items:center;padding-left:30px;']);
var StyledAppBarEnd = styled.div.withConfig({
  displayName: 'AppBar__StyledAppBarEnd'
})(['margin-left:auto;padding-right:30px;']);

var StyledAppBarTitle = getPublicUrl(styled.h1.withConfig({
  displayName: 'AppBar__StyledAppBarTitle'
})(['padding-right:20px;margin-right:calc(20px - 7px);white-space:nowrap;background-image:', ';background-position:100% 50%;background-repeat:no-repeat;cursor:', ';'], function (_ref) {
  var chevron = _ref.chevron;
  return chevron ? css(['url(', ')'], styledPublicUrl(chevronSvg)) : 'none';
}, function (_ref2) {
  var clickable = _ref2.clickable;
  return clickable ? 'pointer' : 'default';
}));

var AppBar = function AppBar(_ref3) {
  var children = _ref3.children,
      endContent = _ref3.endContent,
      title = _ref3.title,
      onTitleClick = _ref3.onTitleClick,
      props = objectWithoutProperties(_ref3, ['children', 'endContent', 'title', 'onTitleClick']);
  return React.createElement(
    StyledAppBar,
    props,
    React.createElement(
      StyledAppBarStart,
      null,
      React.createElement(
        StyledAppBarTitle,
        {
          chevron: !!children,
          clickable: !!onTitleClick,
          onClick: onTitleClick
        },
        React.createElement(
          TypedText,
          { size: 'xxlarge' },
          title
        )
      )
    ),
    children,
    endContent && React.createElement(
      StyledAppBarEnd,
      null,
      endContent
    )
  );
};

var logo$3 = "data:image/svg+xml,%3Csvg%20width%3D%221129%22%20height%3D%22792%22%20viewBox%3D%220%200%201129%20792%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3ClinearGradient%20x1%3D%2258.303%25%22%20y1%3D%2229.305%25%22%20x2%3D%22-20.356%25%22%20y2%3D%2289.584%25%22%20id%3D%22a%22%3E%3Cstop%20stop-color%3D%22%23E9F2F4%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23FFF%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%2250%25%22%20y1%3D%22125.887%25%22%20x2%3D%2250%25%22%20y2%3D%2227.419%25%22%20id%3D%22b%22%3E%3Cstop%20stop-color%3D%22%23E9F2F4%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23FFF%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20x1%3D%2238.76%25%22%20y1%3D%2240.284%25%22%20x2%3D%2227.198%25%22%20y2%3D%224.898%25%22%20id%3D%22c%22%3E%3Cstop%20stop-color%3D%22%23E9F2F4%22%20offset%3D%220%25%22%2F%3E%3Cstop%20stop-color%3D%22%23FFF%22%20offset%3D%22100%25%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%20opacity%3D%22.7%22%3E%3Cpath%20d%3D%22M474.223%2064.24c-.503%200-231.685%2073.873-231.685%20275.905%200%20202.033%20223.146%20300.029%20387.48%20300.029%2089.383%200%20162.808-26.013%20211.24-49.744%206.242-28.642%2028.943-96.473%20104.047-96.981%2013.393-.523%2025.958%201.99%2036.517%208.021%2050.256%2027.144%2017.59%2077.898%2017.59%2077.898%201.894-.307%203.809-.663%205.724-1.075%201.91-.413%203.83-.89%205.764-1.408%2060.404-16.268%20128.467-85.36%20116.661-201.057-9.463-92.774-95.09-151.58-136.743-174.94-13.64-7.648-22.566-11.513-22.566-11.513%201.508-9.423%201.995-16.71%201.995-22.309%200-1.05-.02-2.035-.05-2.96v-10.86C751.617%2020.65%20566.645.223%20475.414.223c-39.412%200-61.5%203.704-61.5%203.704l60.309%2060.313zm461.86%20125.638s-29.652-9.55-59.8-13.57c-15.083%2015.58-28.15%2022.113-32.17%2024.129-.503.497-1.005%201-1.005%201-87.95-18.595-119.612-63.827-119.612-63.827%2082.93-.497%20157.812%2019.098%20212.587%2052.268z%22%20fill%3D%22url%28%23a%29%22%20opacity%3D%22.779%22%2F%3E%3Cpath%20d%3D%22M1018.002%20315.017c0%2065.842-27.134%20126.647-73.375%20175.899l-2.197%202.528%203.704-.01c12.564-.508%2025.129%202.005%2035.688%208.036%2050.256%2027.144%2017.59%2077.898%2017.59%2077.898%2062.82-10.051%20140.719-80.406%20128.15-203.54-9.464-92.774-95.092-151.58-136.744-174.94%2017.901%2035.357%2027.184%2074.19%2027.184%20114.13%22%20fill%3D%22url%28%23b%29%22%20opacity%3D%22.374%22%2F%3E%3Cpath%20d%3D%22M.808%20545.696c0%208.152.317%2015.911.769%2023.495%2062.198%20119.616%20137.015%20224.115%20222.588%20310.653%20106.72%20107.685%20230.9%20187.578%20369.166%20237.539%20137.764-49.785%20261.949-129.854%20369.182-238.057%2031.792-32.144%2062.112-66.887%2090.915-104.012-229.272-16.479-215.346-155.74-215.346-155.74%200-5.524%200-11.057%201.005-16.585%200%200%20.508-4.89%202.176-12.564-48.432%2023.736-121.857%2049.749-211.244%2049.749-164.335%200-387.48-97.996-387.48-300.029%200-202.032%20231.181-275.905%20231.181-275.905l-.12-.035c-5.86-.452-12.143-.472-17.973-.472C202.836%2072.784.808%20284.863.808%20545.696%22%20fill%3D%22url%28%23c%29%22%20opacity%3D%22.557%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E";

var StyledAragonApp = styled.main.withConfig({
  displayName: 'AragonApp__StyledAragonApp'
})(['min-width:320px;min-height:100vh;background-color:', ';background-image:', ';background-position:50% 50%;background-repeat:no-repeat;'], theme.mainBackground, function (_ref) {
  var backgroundLogo = _ref.backgroundLogo;
  return backgroundLogo ? css(['url(', ')'], styledPublicUrl(logo$3)) : 'none';
});

var AragonApp = function (_React$Component) {
  inherits(AragonApp, _React$Component);

  function AragonApp() {
    classCallCheck(this, AragonApp);
    return possibleConstructorReturn(this, (AragonApp.__proto__ || Object.getPrototypeOf(AragonApp)).apply(this, arguments));
  }

  createClass(AragonApp, [{
    key: 'getChildContext',
    value: function getChildContext() {
      return { publicUrl: this.props.publicUrl };
    }
  }, {
    key: 'render',
    value: function render() {
      var _props = this.props,
          children = _props.children,
          backgroundLogo = _props.backgroundLogo,
          className = _props.className,
          publicUrl = _props.publicUrl,
          supportLegacyAgents = _props.supportLegacyAgents;

      var styledProps = { backgroundLogo: backgroundLogo, className: className, publicUrl: publicUrl };
      return React.createElement(
        StyledAragonApp,
        styledProps,
        React.createElement(BaseStyles$1, { publicUrl: publicUrl, legacyFonts: supportLegacyAgents }),
        children
      );
    }
  }]);
  return AragonApp;
}(React.Component);

AragonApp.propTypes = {
  className: propTypes.string,
  backgroundLogo: propTypes.bool,
  publicUrl: propTypes.string,
  children: propTypes.node,
  supportLegacyAgents: propTypes.bool
};
AragonApp.defaultProps = {
  backgroundLogo: false
};
AragonApp.childContextTypes = {
  publicUrl: propTypes.string
};
AragonApp.Styled = StyledAragonApp;

var Container$3 = styled.div.withConfig({
  displayName: 'LayoutGrid__Container'
})(['position:fixed;z-index:999;left:0;right:0;top:0;bottom:0;display:flex;width:', 'px;margin:0 auto;pointerevents:none;'], grid(12));

var Column = styled.div.withConfig({
  displayName: 'LayoutGrid__Column'
})(['width:', 'px;height:100%;background:rgba(184,184,184,0.5);'], grid(1));

var LayoutGrid = function LayoutGrid() {
  return React.createElement(
    Container$3,
    null,
    [].concat(toConsumableArray(Array(12))).map(function (v, i, arr) {
      return React.createElement(
        'div',
        {
          key: i,
          style: { width: grid(1, i < arr.length - 1 ? 1 : 0) + 'px' }
        },
        React.createElement(Column, null)
      );
    })
  );
};

/* eslint-disable prettier/prettier */

export { theme, themeDark, brand, colors, difference, formatHtmlDatetime, formatIntegerRange, font, grid, spring, breakpoint, BreakPoint, unselectable, redraw, redrawFromDate, BaseStyles$1 as BaseStyles, Section, IllustratedSection, BadgeNumber, Badge, Button, CircleGraph, ContextMenu, ContextMenuItem, Countdown$1 as Countdown, DropDown, Field, Info$1 as Info, RadioButton, TextInput, Footer$1 as Footer, PreFooter, Header, SafeLink, WrappedSidePanel as SidePanel, SidePanelSeparator, SidePanelSplit, RadioGroup, RadioList, Table, TableCell, TableHeader, StyledTableRow as TableRow, TypedText as Text, StyledCard as Card, EmptyStateCard, AppBar, AragonApp, LayoutGrid, Add as IconAdd, Apps as IconApps, Blank as IconBlank, Check as IconCheck, Cross as IconCross, Fundraising as IconFundraising, Groups as IconGroups, Home as IconHome, Identity as IconIdentity, Notifications as IconNotifications, Permissions as IconPermissions, Settings as IconSettings, Share as IconShare, Time as IconTime, Wallet as IconWallet, observe };
//# sourceMappingURL=index.esm.js.map
