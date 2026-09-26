namespace WorldGeometry {
    /** Current native head/look direction; content chooses whether to flatten it for a ground maneuver. */
    export function facing(world: CombatWorld, actor: CombatActor): CombatPoint | null {
        if (!world.valid(actor)) return null;
        const entity = world.nativeEntity(actor); if (entity === null) return null;
        const look = entity.getLookAngle();
        return WorldCombat.point(Number(look.x), Number(look.y), Number(look.z));
    }
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

    /** A volume with an exact native body-box intersection predicate. Existing point-region selection stays separate. */
    export interface BodyRegion { boundsMin(): CombatPoint; boundsMax(): CombatPoint; intersects(min: CombatPoint, max: CombatPoint): boolean; }
    function rectangleContains(x: number, z: number, min: CombatPoint, max: CombatPoint): boolean {
        return x >= min.x() - 1e-9 && x <= max.x() + 1e-9 && z >= min.z() - 1e-9 && z <= max.z() + 1e-9;
    }
    function segmentRectangle(a: CombatPoint, b: CombatPoint, min: CombatPoint, max: CombatPoint): boolean {
        var low = 0, high = 1, starts = [a.x(), a.z()], delta = [b.x() - a.x(), b.z() - a.z()], lo = [min.x(), min.z()], hi = [max.x(), max.z()];
        for (var i = 0; i < 2; i++) {
            if (Math.abs(delta[i]) < 1e-12) { if (starts[i] < lo[i] || starts[i] > hi[i]) return false; continue; }
            var t0 = (lo[i] - starts[i]) / delta[i], t1 = (hi[i] - starts[i]) / delta[i];
            low = Math.max(low, Math.min(t0, t1)); high = Math.min(high, Math.max(t0, t1));
            if (low > high + 1e-9) return false;
        }
        return true;
    }
    /** A simple horizontal polygon extruded through an absolute vertical interval. */
    export function bodyPolygon(vertices: CombatPoint[], minY: number, maxY: number): BodyRegion {
        vertices = vertices.slice(); if (vertices.length < 3 || maxY < minY) throw new Error("Invalid body polygon");
        var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        vertices.forEach(p => { minX = Math.min(minX, p.x()); maxX = Math.max(maxX, p.x()); minZ = Math.min(minZ, p.z()); maxZ = Math.max(maxZ, p.z()); });
        return { boundsMin: () => WorldCombat.point(minX, minY, minZ), boundsMax: () => WorldCombat.point(maxX, maxY, maxZ),
            intersects: function (min, max) {
                if (max.y() < minY || min.y() > maxY) return false;
                if (insidePolygon(min.x(), min.z(), vertices) || insidePolygon(min.x(), max.z(), vertices)
                    || insidePolygon(max.x(), min.z(), vertices) || insidePolygon(max.x(), max.z(), vertices)) return true;
                for (var i = 0; i < vertices.length; i++) if (rectangleContains(vertices[i].x(), vertices[i].z(), min, max)
                    || segmentRectangle(vertices[i], vertices[(i + 1) % vertices.length], min, max)) return true;
                return false;
            } };
    }
    export function bodyLane(origin: CombatPoint, direction: CombatPoint, length: number, halfWidth: number, vertical?: Band): BodyRegion {
        var f = flatUnit(direction), side = WorldCombat.point(-f.z(), 0, f.x()).scale(halfWidth), end = origin.plus(f.scale(length)), v = band(vertical);
        return bodyPolygon([origin.minus(side), end.minus(side), end.plus(side), origin.plus(side)], origin.y() - v.below, origin.y() + v.above);
    }
    /** Exact circle/wedge against an axis-aligned native body box; includes corners, radial edges and arc crossings. */
    export function bodySector(origin: CombatPoint, direction: CombatPoint, radius: number, angleDegrees: number, vertical?: Band): BodyRegion {
        var angle = Math.max(0, Math.min(360, angleDegrees)), f = flatUnit(direction), v = band(vertical), cosine = Math.cos(angle * Math.PI / 360);
        var low = WorldCombat.point(origin.x() - radius, origin.y() - v.below, origin.z() - radius), high = WorldCombat.point(origin.x() + radius, origin.y() + v.above, origin.z() + radius);
        function inSector(x: number, z: number): boolean {
            var dx = x - origin.x(), dz = z - origin.z(), d = Math.sqrt(dx * dx + dz * dz);
            return d <= radius + 1e-9 && (d < 1e-9 || angle === 360 || (dx * f.x() + dz * f.z()) / d >= cosine - 1e-9);
        }
        return { boundsMin: () => low, boundsMax: () => high, intersects: function (min, max) {
            if (max.y() < low.y() || min.y() > high.y()) return false;
            var nearestX = Math.max(min.x(), Math.min(max.x(), origin.x())), nearestZ = Math.max(min.z(), Math.min(max.z(), origin.z()));
            if (Math.pow(nearestX - origin.x(), 2) + Math.pow(nearestZ - origin.z(), 2) > radius * radius + 1e-9) return false;
            if (angle === 360 || rectangleContains(origin.x(), origin.z(), min, max)) return true;
            if (inSector(min.x(), min.z()) || inSector(min.x(), max.z()) || inSector(max.x(), min.z()) || inSector(max.x(), max.z())) return true;
            var half = angle * Math.PI / 360;
            for (var side = -1; side <= 1; side += 2) {
                var a = side * half, dx = f.x() * Math.cos(a) - f.z() * Math.sin(a), dz = f.x() * Math.sin(a) + f.z() * Math.cos(a);
                if (segmentRectangle(origin, origin.plus(WorldCombat.point(dx, 0, dz).scale(radius)), min, max)) return true;
            }
            var xs = [min.x(), max.x()], zs = [min.z(), max.z()];
            for (var i = 0; i < 2; i++) {
                var x = xs[i] - origin.x(), z = zs[i] - origin.z();
                if (Math.abs(x) <= radius) { var zz = Math.sqrt(Math.max(0, radius * radius - x * x));
                    for (var sign = -1; sign <= 1; sign += 2) { var zc = origin.z() + sign * zz;
                        if (zc >= min.z() && zc <= max.z() && inSector(xs[i], zc)) return true; } }
                if (Math.abs(z) <= radius) { var xx = Math.sqrt(Math.max(0, radius * radius - z * z));
                    for (var sign = -1; sign <= 1; sign += 2) { var xc = origin.x() + sign * xx;
                        if (xc >= min.x() && xc <= max.x() && inSector(xc, zs[i])) return true; } }
            }
            return false;
        } };
    }
    /** Geometry only: source, team, visibility and harm policy remain explicit in the content visitor. */
    export function selectBodies(world: CombatWorld, region: BodyRegion, visit: (actor: CombatActor, facts: CombatObservation) => void): number {
        var actors = world.queryBox(region.boundsMin(), region.boundsMax(), false), count = 0;
        for (var i = 0; i < actors.length; i++) { var facts = world.observe(actors[i]);
            if (facts && region.intersects(facts.boundsMin(), facts.boundsMax())) { visit(actors[i], facts); count++; } }
        return count;
    }

    /** True sphere/AABB overlap, including large or asymmetric bodies whose centre is outside the sphere. */
    export function bodySphere(centre: CombatPoint, radius: number): BodyRegion {
        if (!isFinite(radius) || radius < 0) throw new Error("A sphere requires a finite nonnegative radius");
        const extent = WorldCombat.point(radius, radius, radius);
        return { boundsMin: () => centre.minus(extent), boundsMax: () => centre.plus(extent), intersects: (min, max) => {
            const x = Math.max(min.x(), Math.min(max.x(), centre.x())) - centre.x();
            const y = Math.max(min.y(), Math.min(max.y(), centre.y())) - centre.y();
            const z = Math.max(min.z(), Math.min(max.z(), centre.z())) - centre.z();
            return x * x + y * y + z * z <= radius * radius;
        } };
    }
    /** A finite 3D segment using the same box inflation convention as native projectile entity sweeps. */
    export function bodySegment(from: CombatPoint, to: CombatPoint, radius: number): BodyRegion {
        var a = [from.x(), from.y(), from.z()], b = [to.x(), to.y(), to.z()];
        return { boundsMin: () => WorldCombat.point(Math.min(a[0],b[0])-radius,Math.min(a[1],b[1])-radius,Math.min(a[2],b[2])-radius),
            boundsMax: () => WorldCombat.point(Math.max(a[0],b[0])+radius,Math.max(a[1],b[1])+radius,Math.max(a[2],b[2])+radius),
            intersects: function (min, max) {
                var low = [min.x()-radius,min.y()-radius,min.z()-radius], high = [max.x()+radius,max.y()+radius,max.z()+radius], enter = 0, leave = 1;
                for (var axis=0;axis<3;axis++) {
                    var delta=b[axis]-a[axis];
                    if (Math.abs(delta)<1e-12) { if(a[axis]<low[axis] || a[axis]>high[axis]) return false; continue; }
                    var first=(low[axis]-a[axis])/delta,last=(high[axis]-a[axis])/delta;
                    enter=Math.max(enter,Math.min(first,last));leave=Math.min(leave,Math.max(first,last));if(enter>leave+1e-9)return false;
                }
                return true;
            } };
    }
    /** A convex polygonal 3D cone section. Its returned rings are the exact authored visual frontier. */
    export function bodyFrustum(from: CombatPoint, to: CombatPoint, nearRadius: number, farRadius: number, sides = 16): BodyRegion & { near: CombatPoint[]; far: CombatPoint[] } {
        if (![nearRadius, farRadius, sides].every(isFinite) || nearRadius < 0 || farRadius < 0 || sides < 3 || sides % 1)
            throw new Error("Invalid polygonal frustum");
        const length = to.minus(from).length(); if (!(length > 0)) throw new Error("A frustum needs two different centres");
        const axis = to.minus(from).scale(1 / length);
        const cross = (a: CombatPoint, b: CombatPoint) => WorldCombat.point(a.y()*b.z()-a.z()*b.y(), a.z()*b.x()-a.x()*b.z(), a.x()*b.y()-a.y()*b.x());
        const dot3 = (a: CombatPoint, b: CombatPoint) => a.x()*b.x()+a.y()*b.y()+a.z()*b.z();
        const reference = Math.abs(axis.y()) < 0.9 ? WorldCombat.point(0,1,0) : WorldCombat.point(1,0,0);
        const right = cross(axis, reference).unit(), up = cross(right, axis).unit();
        const near: CombatPoint[] = [], far: CombatPoint[] = [];
        for (let i=0;i<sides;i++) {
            const angle=i*Math.PI*2/sides, offset=right.scale(Math.cos(angle)).plus(up.scale(Math.sin(angle)));
            near.push(from.plus(offset.scale(nearRadius))); far.push(to.plus(offset.scale(farRadius)));
        }
        const vertices=near.concat(far), axes=[WorldCombat.point(1,0,0),WorldCombat.point(0,1,0),WorldCombat.point(0,0,1),axis];
        function edge(a: CombatPoint,b: CombatPoint): void {
            const delta=b.minus(a);
            axes.push(cross(delta,WorldCombat.point(1,0,0)),cross(delta,WorldCombat.point(0,1,0)),cross(delta,WorldCombat.point(0,0,1)));
        }
        for(let i=0;i<sides;i++) {
            const j=(i+1)%sides;
            axes.push(cross(far[i].minus(near[i]),far[j].minus(near[i])));
            edge(near[i],near[j]);edge(far[i],far[j]);edge(near[i],far[i]);
        }
        const region = bodyConvex(vertices, axes);
        return { near: near, far: far, boundsMin: region.boundsMin, boundsMax: region.boundsMax, intersects: region.intersects };

    }
    /** Shared convex-polyhedron/AABB SAT, with face normals and edge/box-axis cross products supplied by the shape. */
    function bodyConvex(vertices: CombatPoint[], axes: CombatPoint[]): BodyRegion {
        const dot3 = (a: CombatPoint, b: CombatPoint) => a.x()*b.x()+a.y()*b.y()+a.z()*b.z();
        const useful=axes.filter(value=>value.length()>1e-10).map(value=>value.unit());
        const values=vertices.map(value=>[value.x(),value.y(),value.z()]);
        const low=WorldCombat.point(...< [number,number,number] >[0,1,2].map(index=>Math.min.apply(null,values.map(value=>value[index]))));
        const high=WorldCombat.point(...< [number,number,number] >[0,1,2].map(index=>Math.max.apply(null,values.map(value=>value[index]))));
        return { boundsMin:()=>low,boundsMax:()=>high,intersects:(min,max)=> {
            const centre=min.plus(max).scale(.5),half=max.minus(min).scale(.5);
            return useful.every(normal=> {
                const projections=vertices.map(vertex=>dot3(vertex,normal)),middle=dot3(centre,normal);
                const extent=Math.abs(normal.x())*half.x()+Math.abs(normal.y())*half.y()+Math.abs(normal.z())*half.z();
                return Math.max.apply(null,projections)>=middle-extent-1e-9 && Math.min.apply(null,projections)<=middle+extent+1e-9;
            });
        } };
    }
    /** Inclusive intersection of a convex, ordered, coplanar 3D polygon extruded by halfThickness along normal.
     * Shape policy and clipping stay with the caller; split a concave clipped outline into convex pieces. */
    export function bodyPrism(input: CombatPoint[], normal: CombatPoint, halfThickness: number): BodyRegion {
        if (!isFinite(halfThickness) || halfThickness < 0 || !isFinite(normal.length()) || normal.length() <= 1e-10)
            throw new Error("Invalid prism thickness or normal");
        const vertices = input.filter((point, index) => index === 0 || point.minus(input[index-1]).length() > 1e-10).slice();
        if (vertices.length > 1 && vertices[0].minus(vertices[vertices.length-1]).length() <= 1e-10) vertices.pop();
        if (vertices.length < 3 || vertices.some(point => ![point.x(), point.y(), point.z()].every(isFinite)))
            throw new Error("A prism needs three finite vertices");
        const n = normal.unit(), cross = (a: CombatPoint,b: CombatPoint) => WorldCombat.point(
            a.y()*b.z()-a.z()*b.y(),a.z()*b.x()-a.x()*b.z(),a.x()*b.y()-a.y()*b.x());
        const dot = (a: CombatPoint,b: CombatPoint) => a.x()*b.x()+a.y()*b.y()+a.z()*b.z();
        if (vertices.some(point => Math.abs(dot(point.minus(vertices[0]),n)) > 1e-6)) throw new Error("Prism vertices must be coplanar");
        let winding = 0;
        const axes = [WorldCombat.point(1,0,0),WorldCombat.point(0,1,0),WorldCombat.point(0,0,1),n];
        const offset = n.scale(halfThickness), solid = vertices.map(v=>v.minus(offset)).concat(vertices.map(v=>v.plus(offset)));
        function edge(delta: CombatPoint): void {
            axes.push(cross(delta,WorldCombat.point(1,0,0)),cross(delta,WorldCombat.point(0,1,0)),cross(delta,WorldCombat.point(0,0,1)));
        }
        for(let i=0;i<vertices.length;i++) {
            const delta=vertices[(i+1)%vertices.length].minus(vertices[i]), face=cross(delta,n);
            axes.push(face); edge(delta);
            for(let j=0;j<vertices.length;j++) {
                const side=dot(face,vertices[j].minus(vertices[i]));
                if(Math.abs(side)<=1e-8)continue;
                const sign=side>0?1:-1;
                if(winding && sign!==winding)throw new Error("Prism polygon must be convex and ordered");
                winding=sign;
            }
        }
        if(!winding)throw new Error("Prism polygon has no area");
        edge(n);
        return bodyConvex(solid,axes);
    }

}
