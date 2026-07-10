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

class PathToTrackExtension(inkex.EffectExtension):
    def add_arguments(self, pars):
        pars.add_argument("--inicio_recto", type=inkex.Boolean, default=False)
        pars.add_argument("--fin_recto", type=inkex.Boolean, default=False)

    def effect(self):
        for elem in self.svg.selection:
            path_data = elem.get('d')
            coords = track_utils.parse_path_commands(path_data)
            track = track_utils.generate_track_svg(coords, inicio_recto=self.options.inicio_recto, fin_recto=self.options.fin_recto)
            paths = track_utils.generate_path_from_coords(track)
            group = inkex.Group()
            self.svg.get_current_layer().append(group)
            colors = ['#ffff00','#ffffff','#ffff00','#ffffff','#ffff00']
            names = ['bar_up', 'me_up', 'track', 'me_down', 'bar_down']
            for i,path_data in enumerate(paths):
                path = inkex.PathElement()
                path.set("d", path_data)
                path.style = {
                    "stroke": "none",
                    "fill": colors[i]
                }
                path.set('inkscape:label', names[i])
                # Insert the new path into the current Inkscape document
                group.append(path)
            elem.set("style", "display:none")
            #group.append(elem)

if __name__ == '__main__':
    PathToTrackExtension().run()
