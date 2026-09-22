package dev.worldcombat.core.client.particles;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.joml.Vector3d;
import org.joml.Vector3f;

/**
 * Ear clipping of one simple ordered outline, projected by the dominant component of its Newell
 * normal. Either winding is accepted. Sampling retains the original 3D vertices and weights triangles
 * by their 3D area; a nonplanar outline therefore defines a piecewise-planar surface.
 * Consecutive duplicates, a repeated closing vertex and redundant straight-edge vertices are removed.
 * Collapsed, non-finite or self-intersecting projections have no surface and return no sampler.
 */
final class PolygonTriangulation {
    private PolygonTriangulation() {}

    /** Predicates operate after translation and uniform extent normalization. */
    private static final double EPS = 1e-12;
    private record Vertex(Vector3d point, Vector3d normalized, double u, double v) {}
    private record Triangle(Vector3d a, Vector3d b, Vector3d c, double endArea) {}

    static Shape prepare(Vector3d[] points, int count, Vector3d centroid) {
        if (points == null || count < 3 || count > points.length || centroid == null || !centroid.isFinite()) return null;
        Vector3d min = new Vector3d(Double.POSITIVE_INFINITY), max = new Vector3d(Double.NEGATIVE_INFINITY);
        for (int i = 0; i < count; i++) {
            if (points[i] == null || !points[i].isFinite()) return null;
            min.min(points[i]); max.max(points[i]);
        }
        Vector3d span = new Vector3d(max).sub(min);
        double extent = Math.max(span.x, Math.max(span.y, span.z));
        if (!(extent > 0) || !Double.isFinite(extent)) return null;
        var normalized = new Vector3d[count];
        for (int i = 0; i < count; i++) normalized[i] = new Vector3d(points[i]).sub(min).div(extent);
        Vector3d normal = new Vector3d(), cross = new Vector3d();
        for (int i = 0; i < count; i++) normal.add(normalized[i].cross(normalized[(i + 1) % count], cross));
        int drop = 0;
        double largest = Math.abs(normal.x);
        if (Math.abs(normal.y) > largest + EPS) { drop = 1; largest = Math.abs(normal.y); }
        if (Math.abs(normal.z) > largest + EPS) { drop = 2; largest = Math.abs(normal.z); }
        if (!(largest > EPS)) return null;

        List<Vertex> outline = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Vector3d p = normalized[i];
            var vertex = new Vertex(new Vector3d(points[i]), p, drop == 0 ? p.y : p.x, drop == 2 ? p.y : p.z);
            if (outline.isEmpty() || !samePoint(outline.getLast(), vertex)) outline.add(vertex);
        }
        if (outline.size() > 1 && samePoint(outline.getFirst(), outline.getLast())) outline.removeLast();
        if (!cleanOutline(outline) || outline.size() < 3 || !simple(outline)) return null;

        double signedArea = 0;
        for (int i = 0; i < outline.size(); i++) {
            Vertex a = outline.get(i), b = outline.get((i + 1) % outline.size());
            signedArea += a.u * b.v - a.v * b.u;
        }
        if (Math.abs(signedArea) <= EPS) return null;
        if (signedArea < 0) Collections.reverse(outline);
        // Canonical start and winding keep seeded sampling independent of how the outline is listed.
        int first = 0;
        for (int i = 1; i < outline.size(); i++) {
            Vertex a = outline.get(i), b = outline.get(first);
            if (a.u < b.u || a.u == b.u && a.v < b.v) first = i;
        }
        Collections.rotate(outline, -first);

        List<Triangle> triangles = new ArrayList<>();
        while (outline.size() > 3) {
            boolean clipped = false;
            for (int i = 0; i < outline.size(); i++) {
                Vertex a = outline.get((i + outline.size() - 1) % outline.size());
                Vertex b = outline.get(i), c = outline.get((i + 1) % outline.size());
                if (orient(a, b, c) <= EPS) continue;
                boolean occupied = false;
                for (Vertex vertex : outline) {
                    if (vertex == a || vertex == b || vertex == c) continue;
                    if (orient(a, b, vertex) >= -EPS && orient(b, c, vertex) >= -EPS && orient(c, a, vertex) >= -EPS) {
                        occupied = true; break;
                    }
                }
                if (occupied) continue;
                addTriangle(triangles, a, b, c, centroid);
                outline.remove(i);
                clipped = true;
                break;
            }
            if (!clipped) return null;
        }
        if (orient(outline.get(0), outline.get(1), outline.get(2)) <= EPS) return null;
        addTriangle(triangles, outline.get(0), outline.get(1), outline.get(2), centroid);
        double area = triangles.getLast().endArea;
        return (random, index, batch) -> {
            double pick = random.nextDouble() * area;
            int low = 0, high = triangles.size() - 1;
            while (low < high) {
                int middle = (low + high) >>> 1;
                if (pick < triangles.get(middle).endArea) high = middle;
                else low = middle + 1;
            }
            Triangle triangle = triangles.get(low);
            double a = random.nextDouble(), b = random.nextDouble();
            if (a + b > 1) { a = 1 - a; b = 1 - b; }
            Vector3d position = new Vector3d(triangle.a).mul(1 - a - b).fma(a, triangle.b).fma(b, triangle.c);
            return new Shape.Spawn(new Vector3f((float) position.x, (float) position.y, (float) position.z), new Vector3f(0, 1, 0));
        };
    }

    private static void addTriangle(List<Triangle> triangles, Vertex a, Vertex b, Vertex c, Vector3d centroid) {
        Vector3d ab = new Vector3d(b.normalized).sub(a.normalized), ac = new Vector3d(c.normalized).sub(a.normalized);
        double area = ab.cross(ac).length() * 0.5;
        double previous = triangles.isEmpty() ? 0 : triangles.getLast().endArea;
        triangles.add(new Triangle(new Vector3d(a.point).sub(centroid), new Vector3d(b.point).sub(centroid),
            new Vector3d(c.point).sub(centroid), previous + area));
    }

    private static boolean samePoint(Vertex a, Vertex b) {
        return a.normalized.distanceSquared(b.normalized) <= EPS * EPS;
    }

    private static boolean cleanOutline(List<Vertex> outline) {
        boolean changed = true;
        while (changed && outline.size() >= 3) {
            changed = false;
            for (int i = 0; i < outline.size(); i++) {
                Vertex a = outline.get((i + outline.size() - 1) % outline.size());
                Vertex b = outline.get(i), c = outline.get((i + 1) % outline.size());
                if (Math.hypot(a.u - b.u, a.v - b.v) <= EPS) return false;
                if (Math.abs(orient(a, b, c)) > EPS) continue;
                if (!between(a, c, b)) return false;
                Vector3d ab = new Vector3d(b.normalized).sub(a.normalized), ac = new Vector3d(c.normalized).sub(a.normalized);
                if (ab.cross(ac).length() <= EPS) {
                    outline.remove(i); changed = true; break;
                }
            }
        }
        return true;
    }

    private static boolean simple(List<Vertex> outline) {
        int n = outline.size();
        for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) {
            if (j == i + 1 || i == 0 && j == n - 1) continue;
            Vertex a = outline.get(i), b = outline.get((i + 1) % n), c = outline.get(j), d = outline.get((j + 1) % n);
            double abc = orient(a, b, c), abd = orient(a, b, d), cda = orient(c, d, a), cdb = orient(c, d, b);
            if ((abc > EPS && abd < -EPS || abc < -EPS && abd > EPS)
                && (cda > EPS && cdb < -EPS || cda < -EPS && cdb > EPS)) return false;
            if (Math.abs(abc) <= EPS && between(a, b, c) || Math.abs(abd) <= EPS && between(a, b, d)
                || Math.abs(cda) <= EPS && between(c, d, a) || Math.abs(cdb) <= EPS && between(c, d, b)) return false;
        }
        return true;
    }

    private static double orient(Vertex a, Vertex b, Vertex c) {
        return (b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u);
    }

    private static boolean between(Vertex a, Vertex b, Vertex p) {
        return p.u >= Math.min(a.u, b.u) - EPS && p.u <= Math.max(a.u, b.u) + EPS
            && p.v >= Math.min(a.v, b.v) - EPS && p.v <= Math.max(a.v, b.v) + EPS;
    }
}
