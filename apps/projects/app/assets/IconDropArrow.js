import React from 'react'
import PropTypes from 'prop-types'

const IconDropArrow = ({ color }) => (
  <svg width="10.3947" height="5.40094" viewBox="0 0 10.394777 5.40094" fill={color}>
    <path d="m 10.110877,0.26583784 v 0 c -0.2429006,-0.21985005 -0.6330006,-0.21985005 -0.8759006,0 l -4.0375997,3.65420986 -4.03756,-3.65420986 -0.0671,0.07414 0.0671,-0.07414 c -0.24290998,-0.21985005 -0.63300998,-0.21985005 -0.87592998,0 -0.24868,0.22508 -0.24868,0.59451 0,0.81958986 l 4.47548998,4.05062 c 0.1225,0.1109 0.2813,0.1649 0.438,0.1649 0.1566,0 0.3155,-0.054 0.438,-0.1649 l 4.4755003,-4.05062 -0.0671,-0.07414 0.0671,0.07413 c 0.2487,-0.22506986 0.2487,-0.59449986 0,-0.81957986 z" strokeWidth="0.2"/>
  </svg>
)

IconDropArrow.propTypes = {
  color: PropTypes.string,
}

export default IconDropArrow
