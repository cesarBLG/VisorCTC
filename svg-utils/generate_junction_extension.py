#!/usr/bin/env python
# coding=utf-8
#
# Copyright (C) [YEAR] [YOUR NAME], [YOUR EMAIL]
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
"""
Description of this extension
"""

import inkex
import track_utils
import math

def generate_junction(angle):
    # Define constants as before
    lock_width = 8.0
    track_width = 5.0
    desliz_width = 1.0
    desliz_pos = 4.0
    t3L_height = 9.0
    t2R_width = 8.0
    t3R_width = 9.0
    gap_horiz = 1.0
    cut_height = 6.0

    # Using tuples instead of numpy arrays
    vec = (math.cos(angle), math.sin(angle))
    bisec = ((vec[0] + 1) / 2, vec[1] / 2)
    bisec = bisec[0] / math.sqrt(bisec[0]**2 + bisec[1]**2), bisec[1] / math.sqrt(bisec[0]**2 + bisec[1]**2)
    normal = (-bisec[1], bisec[0])

    # Cosine of the angle between vec and bisec
    cosang = vec[0] * bisec[0] + vec[1] * bisec[1]

    # Define cut points using tuples
    cut1 = (lock_width + 2 * gap_horiz + track_width / 2 * math.tan(angle / 2), 0)
    cut2 = (cut1[0] + cut_height / math.tan(angle), cut1[1] + cut_height)

    deslizRneg = track_utils.generate_track_svg([(0, desliz_pos), 
                                    (cut1[0] + desliz_pos * normal[0] / cosang, cut1[1] + desliz_pos * normal[1] / cosang), 
                                    (cut2[0] - desliz_pos / math.sin(angle), cut2[1])],
                                    [-desliz_width / 2, desliz_width / 2])

    deslizRpos0 = track_utils.generate_track_svg([(0, desliz_pos), 
                                    (lock_width + gap_horiz, desliz_pos)],
                                    [-desliz_width / 2, desliz_width / 2])
    
    deslizRpos1 = track_utils.generate_track_svg([(lock_width + gap_horiz, desliz_pos), 
                                    (lock_width + 2 * gap_horiz + t2R_width, desliz_pos)],
                                    [-desliz_width / 2, desliz_width / 2])

    deslizLpos = track_utils.generate_track_svg([(lock_width + gap_horiz, -desliz_pos), 
                                    (lock_width + 2 * gap_horiz + t2R_width, -desliz_pos)],
                                    [-desliz_width / 2, desliz_width / 2])

    deslizLneg0 = track_utils.generate_track_svg([(0, -desliz_pos), 
                                    (lock_width + gap_horiz, -desliz_pos)],
                                    [-desliz_width / 2, desliz_width / 2])

    deslizLneg1 = track_utils.generate_track_svg([(lock_width + gap_horiz, -desliz_pos), 
                                    (cut1[0] - desliz_pos * normal[0] / cosang, cut1[1] - desliz_pos * normal[1] / cosang), 
                                    (cut2[0] + desliz_pos / math.sin(angle), cut2[1])],
                                    [-desliz_width / 2, desliz_width / 2])
    
    deslizLneg2 = track_utils.generate_track_svg([(lock_width + 2 * gap_horiz + t2R_width, desliz_pos),
                                    (cut1[0] - desliz_pos * normal[0] / cosang + 2 * desliz_pos / math.tan(angle), desliz_pos),
                                    (cut2[0] + desliz_pos / math.sin(angle), cut2[1])],
                                    [-desliz_width / 2, desliz_width / 2])

    t1 = track_utils.generate_track_svg([(gap_horiz, 0), 
                            (gap_horiz + lock_width, 0)],
                            [-track_width / 2, track_width / 2])

    t2 = [(lock_width + 2 * gap_horiz, -track_width / 2), 
        (cut1[0] - track_width / 2 * normal[0] / cosang, cut1[1] - track_width / 2 * normal[1] / cosang), 
        (lock_width + 2 * gap_horiz + track_width / math.sin(angle), track_width / 2), 
        (lock_width + 2 * gap_horiz, track_width / 2)]

    t2 = [[t2[0], t2[3]], [t2[1], t2[2]]]

    t2L = track_utils.generate_track_svg([(lock_width + 2 * gap_horiz + track_width / 2 / math.sin(angle), track_width / 2), cut2],
                            [-track_width / 2, track_width / 2])

    t3L = track_utils.generate_track_svg([cut2, 
                            (cut2[0] + t3L_height / math.tan(angle), cut2[1] + t3L_height)])

    t2R = [(cut1[0] - track_width / 2 * normal[0] / cosang, cut1[1] - track_width / 2 * normal[1] / cosang), 
        (lock_width + 2 * gap_horiz + track_width / math.sin(angle), track_width / 2), 
        (lock_width + 2 * gap_horiz + t2R_width, track_width / 2), 
        (lock_width + 2 * gap_horiz + t2R_width, -track_width / 2)]

    t2R = [[t2R[0], t2R[3]], [t2R[1], t2R[2]]]

    t3R = track_utils.generate_track_svg([(lock_width + 2 * gap_horiz + t2R_width, 0), 
                            (lock_width + 2 * gap_horiz + t2R_width + t3R_width, 0)])
    return [deslizRneg, deslizRpos0, deslizRpos1, deslizLpos, deslizLneg0, deslizLneg1, deslizLneg2, t1, t2, t2L, t3L, t2R, t3R]


class GenerateJunctionExtension(inkex.EffectExtension):
    def add_arguments(self, pars):
        pars.add_argument("--angulo", type=float, default=7.0)

    def effect(self):
        group = inkex.Group()
        self.svg.get_current_layer().append(group)
        items = generate_junction(self.options.angulo*math.pi/18)
        names = ['deslizRneg', 'deslizRpos0', 'deslizRpos1', 'deslizLpos', 'deslizLneg0', 'deslizLneg1', 'deslizLneg2', 't1', 't2', 't2L', 't3L', 't2R', 't3R']

        def append_path(group, path_data, name, color='#ffff00'):
            path = inkex.PathElement()
            path.set("d", path_data)
            path.style = {
                "stroke": "none",
                "fill": color
            }
            path.set("inkscape:label", name)
            # Insert the new path into the current Inkscape document
            group.append(path)

        for i, coords in enumerate(items):
            if names[i] == "t3L" or names[i] == "t3R":
                group2 = inkex.Group()
                group.append(group2)
                group2.set("inkscape:label", names[i])
                colors2 = ['#ffff00','#ffffff','#ffff00','#ffffff','#ffff00']
                names2 = ['bar_up', 'me_up', 'track', 'me_down', 'bar_down']
                for j, p in enumerate(track_utils.generate_path_from_coords(coords)):
                    append_path(group2, p, names2[j], colors2[j])
            else:
                for p in track_utils.generate_path_from_coords(coords):
                    append_path(group, p, names[i])

if __name__ == '__main__':
    GenerateJunctionExtension().run()
