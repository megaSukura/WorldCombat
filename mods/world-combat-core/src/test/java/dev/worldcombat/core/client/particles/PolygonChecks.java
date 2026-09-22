package dev.worldcombat.core.client.particles;

import com.google.gson.JsonObject;
import org.joml.Vector3d;

/** Neutral polygon sampling regressions, exercised by ShapeChecks. */
public final class PolygonChecks {
    private PolygonChecks() {}

    public static void main(String[] args) {
        checkConcavityAndArea();
        checkProjectionAndWinding();
        checkRedundantVertices();
        checkDegeneratePaths();
        checkNonplanarArea();
        System.out.println("PolygonChecks PASS");
    }

    private static Shapes.PathShape polygon() { return (Shapes.PathShape) Shapes.of("polygon", new JsonObject()); }

    private static Vector3d[] outline() { return points(0,0, 5,0, 5,4, 4,4, 4,1, 1,1, 1,4, 0,4); }

    private static void checkConcavityAndArea() {
        Vector3d[] vertices = outline();
        Vector3d centre = centre(vertices);
        Shape sampler = requireSampler(vertices, centre);
        ParticleRandom random = new ParticleRandom(43);
        int count = 24000, bottom = 0, left = 0, right = 0;
        for (int i = 0; i < count; i++) {
            Vector3d sample = sample(sampler, random, centre);
            insideOutline(sample.x, sample.z);
            near(0, sample.y, 1e-6, "horizontal polygon remains planar");
            if (sample.z < 1) bottom++;
            else if (sample.x < 1) left++;
            else right++;
        }
        near(5.0 / 11, bottom / (double) count, 0.015, "area-weighted bottom strip");
        near(3.0 / 11, left / (double) count, 0.015, "area-weighted left strip");
        near(3.0 / 11, right / (double) count, 0.015, "area-weighted right strip");

        vertices = points(0,0, 6,0, 6,1, 0,4);
        centre = centre(vertices);
        sampler = requireSampler(vertices, centre);
        random = new ParticleRandom(44);
        left = 0;
        for (int i = 0; i < count; i++) {
            Vector3d p = sample(sampler, random, centre);
            check(p.x >= -1e-6 && p.x <= 6 + 1e-6 && p.z >= -1e-6 && p.z <= 4 - p.x / 2 + 1e-6, "convex polygon interior");
            if (p.x < 3) left++;
        }
        near(0.65, left / (double) count, 0.015, "unequal convex triangles retain area weighting");
    }

    private static void checkProjectionAndWinding() {
        Vector3d[][] bases = {
            {new Vector3d(1,0,0), new Vector3d(0,0,1)},
            {new Vector3d(1,0,0), new Vector3d(0,1,0)},
            {new Vector3d(0,1,0), new Vector3d(0,0,1)},
            {new Vector3d(0.8,0.6,0), new Vector3d(-0.36,0.48,0.8)}
        };
        Vector3d origin = new Vector3d(30000000, 123, -30000000);
        for (Vector3d[] basis : bases) {
            Vector3d u = basis[0], v = basis[1], normal = new Vector3d(u).cross(v);
            Vector3d[] vertices = outline(), reverse = new Vector3d[vertices.length], shifted = new Vector3d[vertices.length];
            for (int i = 0; i < vertices.length; i++)
                vertices[i] = new Vector3d(origin).fma(vertices[i].x, u).fma(vertices[i].z, v);
            for (int i = 0; i < vertices.length; i++) {
                reverse[i] = vertices[vertices.length - 1 - i];
                shifted[i] = vertices[(i + 3) % vertices.length];
            }
            Vector3d centre = centre(vertices), reverseCentre = centre(reverse), shiftedCentre = centre(shifted);
            Shape forward = requireSampler(vertices, centre), backward = requireSampler(reverse, reverseCentre), rotated = requireSampler(shifted, shiftedCentre);
            ParticleRandom a = new ParticleRandom(45), b = new ParticleRandom(45), c = new ParticleRandom(45);
            for (int i = 0; i < 3000; i++) {
                Vector3d p = sample(forward, a, centre);
                near(0, p.distance(sample(backward, b, reverseCentre)), 1e-5, "reversed winding preserves seeded samples");
                near(0, p.distance(sample(rotated, c, shiftedCentre)), 1e-5, "rotating the first vertex preserves seeded samples");
                p.sub(origin);
                insideOutline(p.dot(u), p.dot(v));
                near(0, p.dot(normal), 1e-5, "projected sampling preserves the original tilted plane");
            }
        }
    }

    private static void checkRedundantVertices() {
        Vector3d[] plain = outline();
        Vector3d[] redundant = points(0,0, 2,0, 5,0, 5,0, 5,4, 4,4, 4,1, 1,1, 1,4, 0,4, 0,0);
        Vector3d aCentre = centre(plain), bCentre = centre(redundant);
        Shape a = requireSampler(plain, aCentre), b = requireSampler(redundant, bCentre);
        ParticleRandom first = new ParticleRandom(46), second = new ParticleRandom(46);
        for (int i = 0; i < 3000; i++) {
            Vector3d p = sample(a, first, aCentre), q = sample(b, second, bCentre);
            insideOutline(q.x, q.z);
            near(0, p.distance(q), 1e-6, "duplicates and straight-edge vertices do not change the sampled surface");
        }
        Vector3d[] thin = points(0,0, 1,0, 1,1e-7, 0,1e-7);
        check(polygon().prepare(thin, thin.length, centre(thin)) != null, "thin finite-area outline remains valid");
        for (Vector3d point : plain) point.mul(1e-7);
        check(polygon().prepare(plain, plain.length, centre(plain)) != null, "small polygons use relative tolerances");
    }

    private static void checkDegeneratePaths() {
        Vector3d[][] invalid = {
            points(), points(0,0), points(0,0, 1,1), points(2,2, 2,2, 2,2),
            points(0,0, 1,1, 2,2, 3,3), points(0,0, 3,3, 0,3, 3,0),
            points(0,0, 4,3, 0,4, 3,0), points(0,0, 4,0, 2,0, 4,4, 0,4),
            points(0,0, 4,0, 4,4, 2,2, 0,4, 2,2), points(0,0, 2,0, Double.NaN,1)
        };
        for (Vector3d[] vertices : invalid) {
            check(polygon().prepare(vertices, vertices.length, centre(vertices)) == null, "invalid polygon produces no prepared surface");
            check(polygon().sample(new ParticleRandom(1), vertices, vertices.length, centre(vertices)) == null,
                "invalid polygon never falls back to a centroid particle");
        }
    }

    private static void checkNonplanarArea() {
        // Two triangles have equal projected area and unequal 3D area.
        Vector3d[] vertices = {new Vector3d(0,0,0), new Vector3d(1,0,0), new Vector3d(1,0.5,1), new Vector3d(0,0,1)};
        Vector3d centre = centre(vertices);
        Shape sampler = requireSampler(vertices, centre);
        ParticleRandom random = new ParticleRandom(47);
        int raised = 0, count = 20000;
        for (int i = 0; i < count; i++) {
            Vector3d p = sample(sampler, random, centre);
            check(p.x >= -1e-6 && p.x <= 1 + 1e-6 && p.z >= -1e-6 && p.z <= 1 + 1e-6, "nonplanar projected boundary");
            near(Math.max(0, (p.x + p.z - 1) * 0.5), p.y, 1e-6, "original 3D triangle heights are retained");
            if (p.x + p.z > 1) raised++;
        }
        double raisedArea = Math.sqrt(1.5);
        near(raisedArea / (1 + raisedArea), raised / (double) count, 0.015, "3D rather than projected area determines sample probability");
    }

    private static Shape requireSampler(Vector3d[] vertices, Vector3d centre) {
        Shape result = polygon().prepare(vertices, vertices.length, centre);
        check(result != null, "simple polygon has a sampler");
        return result;
    }
    private static Vector3d sample(Shape shape, ParticleRandom random, Vector3d centre) {
        Shape.Spawn spawn = shape.sample(random, 0, 1);
        check(spawn.position().isFinite() && spawn.direction().isFinite(), "polygon sample is finite");
        check(spawn.direction().equals(0, 1, 0), "polygon retains its existing +Y emission direction");
        return new Vector3d(spawn.position()).add(centre);
    }
    private static Vector3d[] points(double... xz) {
        Vector3d[] result = new Vector3d[xz.length / 2];
        for (int i = 0; i < result.length; i++) result[i] = new Vector3d(xz[i * 2], 0, xz[i * 2 + 1]);
        return result;
    }
    private static Vector3d centre(Vector3d[] vertices) {
        Vector3d result = new Vector3d();
        for (Vector3d vertex : vertices) result.add(vertex);
        return vertices.length == 0 ? result : result.div(vertices.length);
    }
    private static void insideOutline(double x, double z) {
        check(x >= -1e-5 && x <= 5 + 1e-5 && z >= -1e-5 && z <= 4 + 1e-5, "sample within outer boundary");
        check(!(x > 1 + 1e-5 && x < 4 - 1e-5 && z > 1 + 1e-5), "sample cannot enter the concave cutout: " + x + "," + z);
    }
    private static void near(double expected, double actual, double epsilon, String message) {
        check(Double.isFinite(actual) && Math.abs(expected - actual) <= epsilon, message + ": " + actual);
    }
    private static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
}
