namespace WorldGeometry {
    /**
     * Regions of the world for selecting who and what a move reaches. The host answers one question
     * (every living thing inside a sphere); a region turns that answer into the shape the move has:
     * a wedge in front of the caster, a corridor along a line, a slab between vertices, a band around
     * a centre. Every region is horizontal geometry in x/z with a vertical band, which is how a
     * Minecraft fight reads: things stand on the ground, and the shape is what the ground shows.
     */
    export interface Region {
        /** Point predicate; custom regions may compose contains() with ordinary &&, || and !. */
        contains(point: CombatPoint): boolean;
        /** Centre of the sphere that covers the region. */
        centre(): CombatPoint;
        /** Radius of that sphere. */
        radius(): number;
    }
    /** Vertical extent around the region's own height: blocks below the base and above it. */
    export interface Band { below?: number; above?: number; }

    var DEFAULT_BAND: Band = { below: 1, above: 3 };

    function band(value?: Band): { below: number; above: number } {
        return { below: value && value.below !== undefined ? value.below : DEFAULT_BAND.below!,
            above: value && value.above !== undefined ? value.above : DEFAULT_BAND.above! };
    }
    function flat(point: CombatPoint): CombatPoint { return WorldCombat.point(point.x(), 0, point.z()); }
    /**
     * Stable horizontal unit direction. A zero-length or vertical input would throw in `unit()`, so this
     * falls back to `fallback`'s horizontal heading when it has one, and to +z otherwise.
     */
    export function flatUnit(direction: CombatPoint, fallback?: CombatPoint): CombatPoint {
        var forward = flat(direction);
        if (forward.length() > 1e-6) return forward.unit();
        var alternate = fallback ? flat(fallback) : null;
        return alternate && alternate.length() > 1e-6 ? alternate.unit() : WorldCombat.point(0, 0, 1);
    }
    /** Finds the first solid block below `point` and returns the cell centre one block above it; `point` if none. */
    export function ground(world: CombatWorld, point: CombatPoint, drop = 4): CombatPoint {
        var x = Math.floor(point.x()), y = Math.floor(point.y()), z = Math.floor(point.z());
        for (var dy = 1; dy >= -Math.max(0, Math.floor(drop)); dy--) {
            var block = world.block(WorldCombat.point(x, y + dy, z));
            if (block === null) break;
            var id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
            return WorldCombat.point(x + 0.5, y + dy + 1, z + 0.5);
        }
        return point;
    }
    function withinBand(y: number, base: number, vertical: { below: number; above: number }): boolean {
        return y >= base - vertical.below && y <= base + vertical.above;
    }
    function coveringRadius(horizontal: number, vertical: { below: number; above: number }): number {
        var height = Math.max(vertical.below, vertical.above);
        return Math.sqrt(horizontal * horizontal + height * height);
    }

    /** A wedge of `angleDegrees` total opening (0..360), centred on `direction`, reaching `radius` from `origin`. */
    export function sector(origin: CombatPoint, direction: CombatPoint, radius: number, angleDegrees: number, vertical?: Band): Region {
        var forward = flat(direction), heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        var cosHalf = Math.cos(Math.min(360, Math.max(0, angleDegrees)) * Math.PI / 360), v = band(vertical);
        return {
            contains: function (point) {
                if (!withinBand(point.y(), origin.y(), v)) return false;
                var delta = flat(point.minus(origin)), distance = delta.length();
                if (distance > radius) return false;
                if (distance < 1e-6) return true;
                return dot(delta.scale(1 / distance), heading) >= cosHalf - 1e-12;
            },
            centre: function () { return origin; },
            radius: function () { return coveringRadius(radius, v); }
        };
    }

    /** A corridor `length` long and `2 * halfWidth` wide, starting at `origin` and running along `direction`. */
    export function lane(origin: CombatPoint, direction: CombatPoint, length: number, halfWidth: number, vertical?: Band): Region {
        var forward = flat(direction), heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        var side = WorldCombat.point(-heading.z(), 0, heading.x()), v = band(vertical);
        var middle = origin.plus(heading.scale(length / 2)), reach = coveringRadius(Math.sqrt(length * length / 4 + halfWidth * halfWidth), v);
        return {
            contains: function (point) {
                if (!withinBand(point.y(), origin.y(), v)) return false;
                var delta = flat(point.minus(origin)), along = dot(delta, heading);
                return along >= 0 && along <= length && Math.abs(dot(delta, side)) <= halfWidth;
            },
            centre: function () { return middle; },
            radius: function () { return reach; }
        };
    }

    /** A rectangle centred on `centre`, `halfExtents.x()` half-long along `direction` and `halfExtents.z()` half-wide across it. */
    export function box(centre: CombatPoint, direction: CombatPoint, halfExtents: CombatPoint, vertical?: Band): Region {
        var forward = flat(direction), heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        var side = WorldCombat.point(-heading.z(), 0, heading.x()), v = band(vertical);
        var reach = coveringRadius(Math.sqrt(halfExtents.x() * halfExtents.x() + halfExtents.z() * halfExtents.z()), v);
        return {
            contains: function (point) {
                if (!withinBand(point.y(), centre.y(), v)) return false;
                var delta = flat(point.minus(centre));
                return Math.abs(dot(delta, heading)) <= halfExtents.x() && Math.abs(dot(delta, side)) <= halfExtents.z();
            },
            centre: function () { return centre; },
            radius: function () { return reach; }
        };
    }

    /** Between `inner` and `outer` distance from `centre`; `inner` 0 is a full disc. */
    export function ring(centre: CombatPoint, inner: number, outer: number, vertical?: Band): Region {
        var v = band(vertical);
        return {
            contains: function (point) {
                if (!withinBand(point.y(), centre.y(), v)) return false;
                var distance = flat(point.minus(centre)).length();
                return distance >= inner && distance <= outer;
            },
            centre: function () { return centre; },
            radius: function () { return coveringRadius(outer, v); }
        };
    }

    /**
     * A snapshot of the area enclosed by `vertices` in order (three or more; any simple outline, convex or not). The
     * vertical band sits around the mean vertex height, so a shape drawn between standing bodies reaches
     * whatever stands between them.
     */
    export function polygon(vertices: CombatPoint[], vertical?: Band): Region {
        vertices = vertices.slice();
        var v = band(vertical), n = vertices.length, sumX = 0, sumY = 0, sumZ = 0;
        if (n < 3) throw new Error("Polygon requires at least three vertices");
        for (var i = 0; i < n; i++) { sumX += vertices[i].x(); sumY += vertices[i].y(); sumZ += vertices[i].z(); }
        var middle = WorldCombat.point(sumX / n, sumY / n, sumZ / n), reach = 0;
        for (var j = 0; j < n; j++) reach = Math.max(reach, flat(vertices[j].minus(middle)).length());
        reach = coveringRadius(reach, v);
        return {
            contains: function (point) {
                if (!withinBand(point.y(), middle.y(), v)) return false;
                return insidePolygon(point.x(), point.z(), vertices);
            },
            centre: function () { return middle; },
            radius: function () { return reach; }
        };
    }

    /** Closed-boundary point test for a simple horizontal outline; either winding, zero area is empty. */
    export function insidePolygon(x: number, z: number, vertices: CombatPoint[]): boolean {
        var inside = false, boundary = false, area = 0, n = vertices.length;
        if (n < 3 || !isFinite(x) || !isFinite(z)) return false;
        var minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
        for (var k = 0; k < n; k++) {
            var vx = vertices[k].x(), vz = vertices[k].z();
            if (!isFinite(vx) || !isFinite(vz)) return false;
            minX = Math.min(minX, vx); maxX = Math.max(maxX, vx);
            minZ = Math.min(minZ, vz); maxZ = Math.max(maxZ, vz);
        }
        var extent = Math.max(maxX - minX, maxZ - minZ);
        if (!(extent > 0) || !isFinite(extent)) return false;
        x = (x - minX) / extent; z = (z - minZ) / extent;
        for (var i = 0, j = n - 1; i < n; j = i++) {
            var xi = (vertices[i].x() - minX) / extent, zi = (vertices[i].z() - minZ) / extent;
            var xj = (vertices[j].x() - minX) / extent, zj = (vertices[j].z() - minZ) / extent;
            area += xj * zi - xi * zj;
            var cross = (xi - xj) * (z - zj) - (zi - zj) * (x - xj);
            if (Math.abs(cross) <= 1e-12 && x >= Math.min(xi, xj) - 1e-12 && x <= Math.max(xi, xj) + 1e-12
                && z >= Math.min(zi, zj) - 1e-12 && z <= Math.max(zi, zj) + 1e-12) boundary = true;
            if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
        }
        return Math.abs(area) > 1e-12 && (boundary || inside);
    }

    /** Horizontal dot product. */
    export function dot(a: CombatPoint, b: CombatPoint): number { return a.x() * b.x() + a.z() * b.z(); }

    /** Closest point on the segment `a`–`b` to `point`, in three dimensions. */
    export function closestOnSegment(point: CombatPoint, a: CombatPoint, b: CombatPoint): CombatPoint {
        var ab = b.minus(a), lengthSquared = ab.x() * ab.x() + ab.y() * ab.y() + ab.z() * ab.z();
        if (lengthSquared < 1e-9) return a;
        var ap = point.minus(a), t = (ap.x() * ab.x() + ap.y() * ab.y() + ap.z() * ab.z()) / lengthSquared;
        return a.plus(ab.scale(Math.max(0, Math.min(1, t))));
    }

    /** Points spaced a positive `spacing` apart toward `to`, with a shorter final gap when needed; both ends included. */
    export function along(from: CombatPoint, to: CombatPoint, spacing: number): CombatPoint[] {
        var delta = to.minus(from), length = delta.length(), result: CombatPoint[] = [from];
        if (!(length > 0) || !isFinite(length) || !(spacing > 0)) return result;
        var steps = Math.floor(length / spacing);
        for (var i = 1; i <= steps; i++) if (i * spacing < length) result.push(from.plus(delta.scale(i * spacing / length)));
        result.push(to);
        return result;
    }

    /**
     * Samples feet, centre and head of each living actor returned by the host's covering-sphere query.
     * Observation positions are body centres. `visit` may filter by facts (friendly/hostile/visible/tags/grounded),
     * status or any content predicate. The host query tests body centres, so edge-overlapping bodies can be omitted.
     * The returned count is geometric matches, in host distance order; body width is not sampled.
     */
    export function select(world: CombatWorld, region: Region, visit: (actor: CombatActor, facts: CombatObservation) => void): number {
        var actors = world.query(region.centre(), region.radius(), false), count = 0;
        for (var i = 0; i < actors.length; i++) {
            var facts = world.observe(actors[i]);
            if (!facts) continue;
            var centre = facts.position(), halfHeight = facts.height() / 2;
            if (region.contains(centre) || region.contains(WorldCombat.point(centre.x(), centre.y() - halfHeight, centre.z()))
                || region.contains(WorldCombat.point(centre.x(), centre.y() + halfHeight, centre.z()))) { visit(actors[i], facts); count++; }
        }
        return count;
    }

    /** `select` visiting non-friendly actors; neutral actors qualify too. Returns the number visited. */
    export function selectEnemies(world: CombatWorld, region: Region, visit: (actor: CombatActor, facts: CombatObservation) => void): number {
        var count = 0;
        select(world, region, function (actor, facts) { if (!facts.friendly()) { visit(actor, facts); count++; } });
        return count;
    }
}
