import inkex
import track_utils
def create_path(path_data, name, color='#ff0'):
    path = inkex.PathElement()
    path.set("d", path_data)
    path.style = {
        "stroke": "none",
        "fill": color
    }
    path.set("inkscape:label", name)
    return path
def generate_track_svg(points, *, av=True, inicio_recto=True, fin_recto=True, vec_inicio=None, vec_fin=None, name=None):
    group = inkex.Group()
    def gen_points(start, end):
        return track_utils.generate_path_from_coords(track_utils.generate_track_points(points, [start, end], inicio_recto=inicio_recto, fin_recto=fin_recto, vec_inicio=vec_inicio, vec_fin=vec_fin))[0]
    
    group.append(create_path(gen_points(-2.5, 2.5), 'track', '#ff0'))
    if av:
        group.append(create_path(gen_points(-1.25, 1.25), 'bv', '#000'))
    else:
        group2 = inkex.Group()
        group2.set("inkscape:label", "bv")
        group.append(group2)
        group2.append(create_path(gen_points(-4.5, -2.5), 'bv_up', '#f0f'))
        group2.append(create_path(gen_points(2.5, 4.5), 'bv_down', '#f0f'))
    group.append(create_path(gen_points(-4.5, -3.5), 'bar_up', '#ff0'))
    group.append(create_path(gen_points(3.5, 4.5), 'bar_down', '#ff0'))
    group.append(create_path(gen_points(-3.5, -2.5), 'me_up', '#fff'))
    group.append(create_path(gen_points(2.5, 3.5), 'me_down', '#fff'))
    if name:
        group.set("inkscape:label", name)
    return group
