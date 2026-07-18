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
import track_to_svg
import math

def generate_junction(angle, av=False):
    # Define constants as before
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
    cut1 = (track_width / 2 * math.tan(angle / 2), 0)
    cut2 = (cut_height / math.tan(angle), cut_height)

    paths = []

    def gen_path(points, gen, name=None, color='#ff0', *, inicio_recto=True, fin_recto=True, vec_inicio=None, vec_fin=None):
        return track_to_svg.create_path(track_utils.generate_path_from_coords(track_utils.generate_track_points(points, gen, inicio_recto=inicio_recto, fin_recto=fin_recto, vec_inicio=vec_inicio, vec_fin=vec_fin))[0], name, color)

    if not av:
        group = inkex.Group()
        group.set("inkscape:label", "bv")
        paths.append(group)
        group.append(gen_path([(-(desliz_pos + desliz_width / 2) * normal[0] / cosang, - desliz_pos * normal[1] / cosang), (3*gap_horiz / 2 + t2R_width, -desliz_pos)], [-desliz_width / 2, 3*desliz_width / 2], 'bvLpos', '#f0f'))
        group.append(gen_path([((desliz_pos + desliz_width / 2) * normal[0] / cosang, desliz_pos * normal[1] / cosang), (3*gap_horiz / 2 + t2R_width, desliz_pos)], [-3*desliz_width / 2, desliz_width / 2], 'bvRpos', '#f0f'))
        group.append(gen_path([(-desliz_pos * normal[0] / cosang - desliz_width / 2 / math.tan(angle), - desliz_pos * normal[1] / cosang - desliz_width / 2), (cut2[0] + desliz_pos / math.sin(angle), cut2[1])], [-desliz_width / 2, 3*desliz_width / 2], 'bvLneg', '#f0f'))
        group.append(gen_path([(desliz_pos * normal[0] / cosang - desliz_width / 2 / math.tan(angle), desliz_pos * normal[1] / cosang - desliz_width / 2), (cut2[0] - desliz_pos / math.sin(angle), cut2[1])], [-3*desliz_width / 2, desliz_width / 2], 'bvRneg', '#f0f'))


    me = inkex.Group()
    me.set("inkscape:label", "me")
    paths.append(me)
    me.append(gen_path([(0, 0), (3 * gap_horiz / 2 + t2R_width, 0)], [-track_width/2-desliz_width,track_width/2+desliz_width], color='#fff'))
    me.append(gen_path([(track_width / 2 / math.tan(angle), track_width / 2), cut2], [-track_width/2-desliz_width,track_width/2+desliz_width], color='#fff'))

    t2 = [(gap_horiz / 2, -track_width / 2), 
        (-track_width / 2 * normal[0] / cosang, -track_width / 2 * normal[1] / cosang), 
        (-cut1[0] + track_width / math.sin(angle), track_width / 2), 
        (gap_horiz / 2, track_width / 2)]

    paths.append(track_to_svg.create_path(track_utils.generate_path_from_coords([[t2[0], t2[3]], [t2[1], t2[2]]])[0], 't2'))

    paths.append(track_to_svg.generate_track_svg([cut2, 
                            (cut2[0] + t3L_height / math.tan(angle), cut2[1] + t3L_height)], name='t3L', av=av))

    t2R = [(-track_width / 2 * normal[0] / cosang, -track_width / 2 * normal[1] / cosang), 
        (-cut1[0] + track_width / math.sin(angle), track_width / 2), 
        (gap_horiz / 2 + t2R_width, track_width / 2), 
        (gap_horiz / 2 + t2R_width, -track_width / 2)]

    paths.append(track_to_svg.create_path(track_utils.generate_path_from_coords([[t2R[0], t2R[3]], [t2R[1], t2R[2]]])[0], 't2R'))

    paths.append(track_to_svg.generate_track_svg([(3 * gap_horiz / 2 + t2R_width, 0), 
                            (3 * gap_horiz / 2 + t2R_width + t3R_width, 0)], name='t3R', av=av))
    
    if av:
        group = inkex.Group()
        group.set("inkscape:label", "bv")
        paths.append(group)
        #group.append(gen_path([(0, 0), (0,0)], [-track_width/4, track_width/4], 'bvL', '#000', fin_recto=False, vec_fin=bisec))
        group.append(gen_path([(gap_horiz / 2, 0), (gap_horiz / 2 + t2R_width, 0)], [-track_width/4, track_width/4], 'bvLpos', '#000'))
        #group.append(gen_path([(0,0), cut2], [-track_width/4, track_width/4], 'bvLneg', '#000', inicio_recto=False, vec_inicio=bisec))

    
    paths.append(gen_path([(desliz_pos * normal[0] / cosang - desliz_width / 2 / math.tan(angle), desliz_pos * normal[1] / cosang - desliz_width / 2), 
                                    (cut2[0] - desliz_pos / math.sin(angle), cut2[1])],
                                    [-desliz_width / 2, desliz_width / 2], 'deslizRneg'))
    
    paths.append(gen_path([((desliz_pos + desliz_width / 2) * normal[0] / cosang, desliz_pos * normal[1] / cosang), 
                                    (3*gap_horiz / 2 + t2R_width, desliz_pos)],
                                    [-desliz_width / 2, desliz_width / 2], 'deslizRpos1'))

    paths.append(gen_path([(-(desliz_pos + desliz_width / 2) * normal[0] / cosang, - desliz_pos * normal[1] / cosang), 
                                    (3*gap_horiz / 2 + t2R_width, -desliz_pos)],
                                    [-desliz_width / 2, desliz_width / 2], 'deslizLpos'))

    paths.append(gen_path([(-desliz_pos * normal[0] / cosang - desliz_width / 2 / math.tan(angle), - desliz_pos * normal[1] / cosang - desliz_width / 2), 
                                    (cut2[0] + desliz_pos / math.sin(angle), cut2[1])],
                                    [-desliz_width / 2, desliz_width / 2], 'deslizLneg1'))

    return paths


class GenerateJunctionExtension(inkex.EffectExtension):
    def add_arguments(self, pars):
        pars.add_argument("--angulo", type=float, default=7.0)

    def effect(self):
        group = inkex.Group()
        self.svg.get_current_layer().append(group)
        items = generate_junction(self.options.angulo*math.pi/18)
        for item in items:
            group.append(item)

if __name__ == '__main__':
    GenerateJunctionExtension().run()

