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

class PathToTrackExtension(inkex.EffectExtension):
    def add_arguments(self, pars):
        pars.add_argument("--inicio_recto", type=inkex.Boolean, default=False)
        pars.add_argument("--fin_recto", type=inkex.Boolean, default=False)
        pars.add_argument("--av", type=inkex.Boolean, default=False)

    def effect(self):
        for elem in self.svg.selection:
            if isinstance(elem, inkex.Group):
                glabel = elem.get("inkscape:label")
                path_data = None
                for child in list(elem):
                    label = child.get("inkscape:label")
                    if label == glabel:
                        path_data = child.get('d')
                    elif label in ['track', 'me_up', 'me_down', 'bar_up', 'bar_down', 'bv']:
                        elem.remove(child)
                if path_data is not None:
                    coords = track_utils.parse_path_commands(path_data)
                    group = track_to_svg.generate_track_svg(coords, av=self.options.av, inicio_recto=self.options.inicio_recto, fin_recto=self.options.fin_recto, name=elem.get('inkscape:label'))
                    for item in group:
                        elem.append(item)
            else:
                path_data = elem.get('d')
                coords = track_utils.parse_path_commands(path_data)
                group = track_to_svg.generate_track_svg(coords, av=self.options.av, inicio_recto=self.options.inicio_recto, fin_recto=self.options.fin_recto, name=elem.get('inkscape:label'))
                self.svg.get_current_layer().append(group)
                elem.set("style", "display:none")
                self.svg.get_current_layer().remove(elem)
                group.append(elem)

if __name__ == '__main__':
    PathToTrackExtension().run()
