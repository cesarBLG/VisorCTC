
import math
import re

def dot(v1, v2):
    """Calculates the dot product of two 2D vectors represented as tuples."""
    return v1[0] * v2[0] + v1[1] * v2[1]

def generate_track_svg(points, generator=[-4.5, -3.5, -3.5, -2.5, -2.5, 2.5, 2.5, 3.5, 3.5, 4.5], *, inicio_recto=True, fin_recto=True):
    npoints = len(points)
    coords = []
    
    for i in range(npoints):
        if i > 0:
            # Calculate vector to previous point
            vecprev = (points[i][0] - points[i-1][0], points[i][1] - points[i-1][1])
            mag_vecprev = math.sqrt(dot(vecprev, vecprev))  # magnitude of vecprev
            vecprev = (vecprev[0] / mag_vecprev, vecprev[1] / mag_vecprev)  # normalize

        if i < npoints - 1:
            # Calculate vector to next point
            vecnext = (points[i+1][0] - points[i][0], points[i+1][1] - points[i][1])
            mag_vecnext = math.sqrt(dot(vecnext, vecnext))  # magnitude of vecnext
            vecnext = (vecnext[0] / mag_vecnext, vecnext[1] / mag_vecnext)  # normalize

        if i == 0:
            # For the first point, use normal vector n0
            if inicio_recto:
                if abs(vecnext[1]) < abs(vecnext[0]):
                    bisec = (1,0)
                else:
                    bisec = (0,1)
            else:
                bisec = vecnext
            normal = (-bisec[1], bisec[0])  # Perpendicular to bisec
            cosang = dot(vecnext, bisec)
        elif i == npoints - 1:
            if fin_recto:
                if abs(vecprev[1]) < abs(vecprev[0]):
                    bisec = (1,0)
                else:
                    bisec = (0,1)
            else:
                bisec = vecprev
            # For the last point, use normal vector n1
            normal = (-bisec[1], bisec[0])  # Perpendicular to bisec
            cosang = dot(vecprev, bisec)
        else:
            # For middle points, calculate the bisector of the vectors
            bisec = (vecnext[0] + vecprev[0], vecnext[1] + vecprev[1])
            normal = (-bisec[1], bisec[0])  # Perpendicular to bisec
            cosang = dot(bisec, vecprev)

        # Generate new coordinates based on the normal and cosang
        newcoords = []
        for p in generator:
            new_x = points[i][0] + normal[0] * p / cosang
            new_y = points[i][1] + normal[1] * p / cosang
            newcoords.append((new_x, new_y))

        coords.append(newcoords)

    return coords

def generate_path_from_coords(coords):
    instrs = []
    npoints = len(coords)
    for i in range(0, len(coords[0]), 2):
        prev = coords[0][i]
        instr = f"M {prev[0]} {prev[1]} "
        for j in range(1, 2*npoints):
            if j < npoints:
                c = coords[j][i]
            else:
                c = coords[2*npoints-j-1][i+1]
            vec = (c[0]-prev[0], c[1]-prev[1])
            prev = c
            if abs(vec[0]) < 1e-8:
                instr += f'V {c[1]} '
            elif abs(vec[1]) < 1e-8:
                instr += f'H {c[0]} '
            else:
                instr += f'L {c[0]} {c[1]} '
        instr += "Z"
        instrs.append(instr)
    return instrs
    
def parse_path_commands(path_commands):
    # Tokenize commands and numbers
    token_re = re.compile(r"[MmLlHhVv]|-?\d*\.?\d+(?:e[-+]?\d+)?")
    tokens = token_re.findall(path_commands)

    idx = 0
    points = []
    current = (0.0, 0.0)
    last_command = None

    def get_number():
        nonlocal idx
        val = float(tokens[idx])
        idx += 1
        return val

    while idx < len(tokens):
        t = tokens[idx]

        # If token is a command letter
        if re.match(r"[MmLlHhVv]", t):
            command = t
            idx += 1
            last_command = command
        else:
            command = last_command  # implicit repeat

        if command in "Mm":  # moveto
            x = get_number()
            y = get_number()
            if command == "m":
                x += current[0]
                y += current[1]

            current = (x, y)
            points.append(current)

            # Extra pairs after M/m become L commands
            while idx < len(tokens) and re.match(r"-?\d", tokens[idx]):
                x = get_number()
                y = get_number()
                if command == "m":
                    x += current[0]
                    y += current[1]
                current = (x, y)
                points.append(current)

        elif command in "Ll":  # lineto
            while idx < len(tokens) and re.match(r"-?\d", tokens[idx]):
                x = get_number()
                y = get_number()
                if command == "l":
                    x += current[0]
                    y += current[1]
                current = (x, y)
                points.append(current)

        elif command in "Hh":  # horizontal lineto
            while idx < len(tokens) and re.match(r"-?\d", tokens[idx]):
                x = get_number()
                if command == "h":
                    x += current[0]
                current = (x, current[1])
                points.append(current)

        elif command in "Vv":  # vertical lineto
            while idx < len(tokens) and re.match(r"-?\d", tokens[idx]):
                y = get_number()
                if command == "v":
                    y += current[1]
                current = (current[0], y)
                points.append(current)

    return points
