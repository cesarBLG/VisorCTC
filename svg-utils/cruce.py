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

def generate_crossing(angle, av=False):
    # Define constants as before
    track_width = 5.0
    desliz_width = 1.0
    desliz_pos = 4.0
    tA_length = 4.0
    tB_length = 6.0

    # Using tuples instead of numpy arrays
    vec = (math.cos(angle), math.sin(angle))
    paths = []

    def extend_mirror(coords):
        return [(-x, -y) for x, y in coords]
    def gen_path(points, gen, name=None, mirror_name=None, color='#ff0', *, inicio_recto=True, fin_recto=True, vec_inicio=None, vec_fin=None):
        ps = []
        ps.append(track_to_svg.create_path(track_utils.generate_path_from_coords(track_utils.generate_track_points(points, gen, inicio_recto=inicio_recto, fin_recto=fin_recto, vec_inicio=vec_inicio, vec_fin=vec_fin))[0], name, color))
        if mirror_name is not None:
            ps.append(track_to_svg.create_path(track_utils.generate_path_from_coords(track_utils.generate_track_points(extend_mirror(points), gen, inicio_recto=inicio_recto, fin_recto=fin_recto, vec_inicio=(-vec_inicio[0], -vec_inicio[1]) if vec_inicio else None, vec_fin=(-vec_fin[0], -vec_fin[1]) if vec_fin else None))[0], mirror_name, color))
        return ps
    def gen_track(points, name, mirror_name, *, inicio_recto=True, fin_recto=True, vec_inicio=None, vec_fin=None):
        ps = []
        ps.append(track_to_svg.generate_track_svg(points, name=name, inicio_recto=inicio_recto, fin_recto=fin_recto, vec_inicio=vec_inicio, vec_fin=vec_fin, av=av))
        if mirror_name is not None:
            ps.append(track_to_svg.generate_track_svg(extend_mirror(points), name=mirror_name, inicio_recto=inicio_recto, fin_recto=fin_recto, vec_inicio=(-vec_inicio[0], -vec_inicio[1]) if vec_inicio else None, vec_fin=(-vec_fin[0], -vec_fin[1]) if vec_fin else None, av=av))
        return ps
    if angle > 89*math.pi/180:
        cotan = 0
    else:
        cotan = 1 / math.tan(angle)

    vcut = (vec[1], -vec[0])

    if not av:
        group = inkex.Group()
        group.set("inkscape:label", "bv")
        paths.append(group)
        for path in gen_path([(track_width / 2 / math.sin(angle) + tA_length, 0),
                        (0, 0),
                        (track_width / 2 * cotan + vec[0] * tA_length, track_width / 2 + vec[1] * tA_length)],
                        [-desliz_pos-desliz_width/2,-desliz_pos+3*desliz_width/2],
                        'bv1', 'bv2', '#f0f', vec_inicio=(-vcut[0], -vcut[1]), inicio_recto=False):
            group.append(path)
        for path in gen_path([(-(track_width / 2 * cotan + vec[0] * tA_length), -(track_width / 2 + vec[1] * tA_length)),
                            (0,0),
                            (track_width / 2 / math.sin(angle) + tA_length, 0)],
                            [-desliz_pos-desliz_width/2,-desliz_pos+3*desliz_width/2],
                            'bv3', 'bv4', '#f0f', vec_fin=vcut, fin_recto=False):
            group.append(path)

    me = inkex.Group()
    me.set("inkscape:label", "me")
    paths.append(me)
    for path in gen_path([(track_width / 2 / math.sin(angle) + tA_length, 0),
                        (0, 0),
                        (track_width / 2 * cotan + vec[0] * tA_length, track_width / 2 + vec[1] * tA_length)],
                        [-desliz_pos+desliz_width/2,-track_width/2],
                        'me1', 'me2', '#fff', vec_inicio=(-vcut[0], -vcut[1]), inicio_recto=False):
        me.append(path)
    for path in gen_path([(-(track_width / 2 * cotan + vec[0] * tA_length), -(track_width / 2 + vec[1] * tA_length)),
                        (0,0),
                        (track_width / 2 / math.sin(angle) + tA_length, 0)],
                        [-desliz_pos+desliz_width/2,-track_width/2],
                        'me3', 'me4', '#fff', vec_fin=vcut, fin_recto=False):
        me.append(path)

    t5 = [(-track_width / 2 / math.sin(angle)-track_width / 2 * cotan, -track_width / 2),
          (track_width / 2 / math.sin(angle)- track_width / 2 * cotan, -track_width / 2),
          (track_width / 2 / math.sin(angle)+track_width / 2 * cotan, track_width / 2),
          (-track_width / 2 / math.sin(angle)+track_width / 2 * cotan, track_width / 2)
          ]
    paths.append(track_to_svg.create_path(track_utils.generate_path_from_coords([[t5[0], t5[3]], [t5[1], t5[2]]])[0], "t5"))

    paths += gen_path([(track_width / 2 / math.sin(angle) + tA_length, 0),
                        (0, 0),
                        (track_width / 2 * cotan + vec[0] * tA_length, track_width / 2 + vec[1] * tA_length)],
                        [-desliz_pos-desliz_width/2,-desliz_pos+desliz_width/2],
                        'desliz1', 'desliz2', vec_inicio=(-vcut[0], -vcut[1]), inicio_recto=False)
    paths += gen_path([(-(track_width / 2 * cotan + vec[0] * tA_length), -(track_width / 2 + vec[1] * tA_length)),
                        (0,0),
                        (track_width / 2 / math.sin(angle) + tA_length, 0)],
                        [-desliz_pos-desliz_width/2,-desliz_pos+desliz_width/2],
                        'desliz3', 'desliz4', vec_fin=vcut, fin_recto=False)

    paths += gen_path([(track_width / 2 / math.sin(angle), 0), (track_width / 2 / math.sin(angle) + tA_length, 0)], [-track_width/2, track_width/2], 'tA1', 'tA2', vec_inicio=vcut, vec_fin=vcut, inicio_recto=False, fin_recto=False)
    paths += gen_track([(track_width / 2 / math.sin(angle) + tA_length, 0), (track_width / 2 / math.sin(angle) + tA_length + tB_length, 0)], 'tB1', 'tB2', vec_inicio=vcut, vec_fin=vcut, inicio_recto=False, fin_recto=False)
    if angle < 89*math.pi/180:
        paths += gen_track([(track_width / 2 / math.sin(angle) + tA_length + tB_length, 0),(track_width / 2 / math.sin(angle) + tA_length + tB_length + (track_width+desliz_pos+desliz_width/2) * cotan, 0)], 'tC1', 'tC2', vec_inicio=vcut, inicio_recto=False)

    paths += gen_path([(track_width / 2 * cotan, track_width / 2), (track_width / 2 * cotan + vec[0] * tA_length, track_width / 2 + vec[1] * tA_length)], [-track_width/2, track_width/2], 'tA3', 'tA4')
    paths += gen_track([(track_width / 2 * cotan + vec[0] * tA_length, track_width / 2 + vec[1] * tA_length), (track_width / 2 * cotan + vec[0] * (tA_length+tB_length), track_width / 2 + vec[1] * (tA_length+tB_length))], 'tB3', 'tB4')
    if angle < 89*math.pi/180:
        paths += gen_track([(track_width / 2 * cotan + vec[0] * (tA_length + tB_length), track_width / 2 + vec[1] * (tA_length+tB_length)), (track_width / 2 * cotan + vec[0] * (tA_length + tB_length + (track_width+desliz_pos+desliz_width/2) * cotan), track_width / 2 + vec[1] * (tA_length + tB_length + (track_width+desliz_pos+desliz_width/2) * cotan))], 'tC3', 'tC4', fin_recto=False)

    if av:
        group = inkex.Group()
        group.set("inkscape:label", "bv")
        paths.append(group)
        for path in gen_path([(-(track_width / 2 / math.sin(angle) + tA_length), 0),
                        (track_width / 2 / math.sin(angle) + tA_length, 0)],
                        [-track_width/4, track_width/4],
                        'bvPos', None, '#000', vec_inicio=vcut, vec_fin=vcut, inicio_recto=False, fin_recto=False):
            group.append(path)
    
        for path in gen_path([(-(track_width / 2 * cotan + vec[0] * tA_length),-(track_width / 2 + vec[1] * tA_length)),
                            (track_width / 2 * cotan + vec[0] * tA_length, track_width / 2 + vec[1] * tA_length)],
                            [-track_width/4, track_width/4],
                            'bvNeg', None, '#000'):
            group.append(path)

    paths += gen_path([(-(track_width / 2 / math.sin(angle) + tA_length), 0),
                        (track_width / 2 / math.sin(angle) + tA_length, 0)],
                        [-desliz_pos-desliz_width/2,-desliz_pos+desliz_width/2],
                        'deslizRpos', vec_inicio=vcut, vec_fin=vcut, inicio_recto=False, fin_recto=False)
    paths += gen_path([(-(track_width / 2 / math.sin(angle) + tA_length), 0),
                        (track_width / 2 / math.sin(angle) + tA_length, 0)],
                        [desliz_pos-desliz_width/2,desliz_pos+desliz_width/2],
                        'deslizLpos', vec_inicio=vcut, vec_fin=vcut, inicio_recto=False, fin_recto=False)
    
    paths += gen_path([(-(track_width / 2 * cotan + vec[0] * tA_length),-(track_width / 2 + vec[1] * tA_length)),
                        (track_width / 2 * cotan + vec[0] * tA_length, track_width / 2 + vec[1] * tA_length)],
                        [-desliz_pos-desliz_width/2,-desliz_pos+desliz_width/2],
                        'deslizRneg')
    paths += gen_path([(-(track_width / 2 * cotan + vec[0] * tA_length),-(track_width / 2 + vec[1] * tA_length)),
                        (track_width / 2 * cotan + vec[0] * tA_length, track_width / 2 + vec[1] * tA_length)],
                        [desliz_pos-desliz_width/2,desliz_pos+desliz_width/2],
                        'deslizLneg')
    
    return paths

class GenerateCrossingExtension(inkex.EffectExtension):
    def add_arguments(self, pars):
        pars.add_argument("--angulo", type=float, default=7.0)

    def effect(self):
        group = inkex.Group()
        self.svg.get_current_layer().append(group)
        items = generate_crossing(self.options.angulo*math.pi/18)
        for item in items:
            group.append(item)

if __name__ == '__main__':
    GenerateCrossingExtension().run()


