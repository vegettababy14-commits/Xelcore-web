particlesJS("particles-js", {
  "particles": {
    "number": {
      "value": 60,
      "density": { "enable": true, "value_area": 800 }
    },
    "color": { "value": "#00c897" },
    "shape": { "type": "circle" },
    "opacity": {
      "value": 0.6,
      "random": true
    },
    "size": {
      "value": 3,
      "random": true
    },
    "line_linked": {
      "enable": true,
      "distance": 150,
      "color": "#00c897",
      "opacity": 0.25,
      "width": 1
    },
    "move": {
      "enable": true,
      "speed": 2,
      "direction": "none",
      "random": false,
      "straight": false,
      "out_mode": "out",
      "bounce": false
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": { "enable": true, "mode": "grab" },
      "onclick": { "enable": true, "mode": "push" },
      "resize": true
    },
    "modes": {
      "grab": { "distance": 140, "line_linked": { "opacity": 0.5 } }
    }
  },
  "retina_detect": true
});