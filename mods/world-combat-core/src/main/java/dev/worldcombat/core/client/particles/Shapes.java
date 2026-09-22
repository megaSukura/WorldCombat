package dev.worldcombat.core.client.particles;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.util.Set;
import org.joml.Vector3f;

/**
 * Shape factory. Owned by wave 1. Pure logic; no Minecraft dependency.
 *
 * <p>Samples are produced in a Y-up local frame. {@code rotation} is a [yaw, pitch, roll] triple in
 * degrees applied to both the position and the direction as yaw about Y, then pitch about X, then
 * roll about Z. {@code randomDirection} blends the sampled direction toward a uniform random unit
 * vector; the result is normalized, so every returned direction is a unit vector.
 *
 * <p>For volumetric kinds {@code thickness} is {@code 0..1}: {@code 0} fills the volume and
 * {@code 1} keeps only the surface, so the inner radius is {@code radius * thickness}. {@code torus}
 * instead treats {@code thickness} as the absolute tube radius in blocks. {@code ring} and
 * {@code arc} accept {@code innerRadius}/{@code outerRadius} in blocks, or an absolute
 * {@code thickness} band width centred on {@code radius}; a zero-width ring samples exactly at
 * {@code radius}. {@code circle}, {@code ring} and {@code arc} live in the XZ plane.
 */
public final class Shapes {
    private Shapes() {}

    private static final Set<String> COMMON = Set.of("rotation", "randomDirection");

    private static final Raw POINT =
        (random, index, count) -> new Shape.Spawn(new Vector3f(), new Vector3f(0, 1, 0));

    /** A zero-extent point spawning along local +Y. */
    public static Shape point() {
        return wrap(POINT, new JsonObject(), Set.of(), "point");
    }

    /**
     * Builds a shape from the authored {@code kind} and its parameters.
     *
     * @param kind   one of point/box/sphere/hemisphere/circle/ring/cone/cone_volume/line/arc/torus/cylinder/sphere_surface,
     *               or polyline/polygon which sample the vertices of a {@code path} binding
     * @param params the authored shape object, excluding {@code kind}
     * @return the sampler; throws {@link IllegalArgumentException} with a JSON path on bad input
     */
    public static Shape of(String kind, JsonObject params) {
        if (kind == null || kind.isBlank()) throw new IllegalArgumentException("shape.kind is required");
        JsonObject p = params == null ? new JsonObject() : params;
        JsonElement declared = p.get("kind");
        if (declared != null && !declared.isJsonNull()) {
            if (!declared.isJsonPrimitive() || !declared.getAsJsonPrimitive().isString() || !kind.equals(declared.getAsString()))
                throw new IllegalArgumentException("shape.kind '" + declared + "' does not match factory kind '" + kind + "'");
        }
        return switch (kind) {
            case "point" -> wrap(POINT, p, Set.of(), kind);
            case "box" -> box(p);
            case "sphere" -> sphere(p, false);
            case "hemisphere" -> sphere(p, true);
            case "sphere_surface" -> sphereSurface(p);
            case "circle" -> circle(p);
            case "ring" -> ring(p, false);
            case "arc" -> ring(p, true);
            case "cone" -> cone(p, false);
            case "cone_volume" -> cone(p, true);
            case "line" -> line(p);
            case "torus" -> torus(p);
            case "cylinder" -> cylinder(p);
            case "polyline" -> polyline(p);
            case "polygon" -> polygon(p);
            default -> throw new IllegalArgumentException("shape.kind unknown: '" + kind + "'");
        };
    }

    /**
     * A shape sampled over the vertices of a {@code path} binding instead of around a single anchor.
     * Positions are absolute world offsets from the vertex centroid and are never scaled.
     */
    public abstract static class PathShape implements Shape {
        private final String kind;
        PathShape(String kind) { this.kind = kind; }
        public String kind() { return kind; }
        /** Path shapes need vertices; without them they collapse to the centroid. */
        @Override public Spawn sample(ParticleRandom random, int index, int count) {
            return new Spawn(new Vector3f(), new Vector3f(0, 1, 0));
        }
        /**
         * @param vertices resolved vertex positions, {@code count} of them in order
         * @param centroid their mean; the returned position is relative to it
         */
        public abstract Spawn sample(ParticleRandom random, org.joml.Vector3d[] vertices, int count, org.joml.Vector3d centroid);

        /** Prepared once per emitter tick; null means the current path has no sampleable geometry. */
        public Shape prepare(org.joml.Vector3d[] vertices, int count, org.joml.Vector3d centroid) {
            return count < 2 ? null : (random, index, batch) -> sample(random, vertices, count, centroid);
        }
    }

    /** Along the edges between consecutive vertices; {@code closed} adds the edge back to the first vertex. */
    private static Shape polyline(JsonObject p) {
        requireOnly(p, Set.of("closed"), "polyline");
        boolean closed = p.has("closed") && !p.get("closed").isJsonNull() && p.get("closed").getAsBoolean();
        return new PathShape("polyline") {
            @Override public Spawn sample(ParticleRandom random, org.joml.Vector3d[] v, int count, org.joml.Vector3d centroid) {
                int edges = closed ? count : count - 1;
                if (edges < 1) return super.sample(random, 0, 1);
                double total = 0; double[] lengths = new double[edges];
                for (int e = 0; e < edges; e++) { lengths[e] = v[e].distance(v[(e + 1) % count]); total += lengths[e]; }
                double pick = random.nextDouble() * total; int edge = 0;
                while (edge < edges - 1 && pick > lengths[edge]) { pick -= lengths[edge]; edge++; }
                var a = v[edge]; var b = v[(edge + 1) % count];
                double t = lengths[edge] > 1e-9 ? pick / lengths[edge] : 0;
                double x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
                // Away from the centroid, flattened to the horizontal plane: the outline breathes outward.
                Vector3f direction = new Vector3f((float) (x - centroid.x), 0, (float) (z - centroid.z));
                if (direction.lengthSquared() < 1e-12) direction.set(0, 1, 0);
                return new Spawn(new Vector3f((float) (x - centroid.x), (float) (y - centroid.y), (float) (z - centroid.z)), direction.normalize());
            }
        };
    }

    /** Area-weighted triangulation of a simple ordered outline, convex or concave, in either winding. */
    private static Shape polygon(JsonObject p) {
        requireOnly(p, Set.of(), "polygon");
        return new PathShape("polygon") {
            @Override public Spawn sample(ParticleRandom random, org.joml.Vector3d[] v, int count, org.joml.Vector3d centroid) {
                Shape prepared = prepare(v, count, centroid);
                return prepared == null ? null : prepared.sample(random, 0, 1);
            }
            @Override public Shape prepare(org.joml.Vector3d[] v, int count, org.joml.Vector3d centroid) {
                return PolygonTriangulation.prepare(v, count, centroid);
            }
        };
    }

    private static Shape box(JsonObject p) {
        double[] size = vector3(p, "size", "box");
        if (size[0] < 0 || size[1] < 0 || size[2] < 0)
            throw new IllegalArgumentException("shape.size components must be non-negative for kind 'box'");
        return wrap((random, index, count) -> {
            Vector3f position = new Vector3f(
                (float) ((random.nextDouble() - 0.5) * size[0]),
                (float) ((random.nextDouble() - 0.5) * size[1]),
                (float) ((random.nextDouble() - 0.5) * size[2]));
            return new Shape.Spawn(position, new Vector3f(0, 1, 0));
        }, p, Set.of("size"), "box");
    }

    private static Shape sphere(JsonObject p, boolean hemisphere) {
        String kind = hemisphere ? "hemisphere" : "sphere";
        double radius = nonNegative(p, "radius", kind);
        double thickness = thickness(p, kind);
        return wrap((random, index, count) -> {
            double polar = hemisphere ? random.nextDouble() : 2 * random.nextDouble() - 1;
            double theta = 2 * Math.PI * random.nextDouble();
            double planar = Math.sqrt(Math.max(0, 1 - polar * polar));
            Vector3f direction = new Vector3f(
                (float) (planar * Math.cos(theta)), (float) polar, (float) (planar * Math.sin(theta)));
            double distance = shellRadius(random, radius, thickness, 3);
            return new Shape.Spawn(new Vector3f(direction).mul((float) distance), direction);
        }, p, Set.of("radius", "thickness"), kind);
    }

    private static Shape sphereSurface(JsonObject p) {
        double radius = nonNegative(p, "radius", "sphere_surface");
        return wrap((random, index, count) -> {
            double polar = 2 * random.nextDouble() - 1;
            double theta = 2 * Math.PI * random.nextDouble();
            double planar = Math.sqrt(Math.max(0, 1 - polar * polar));
            Vector3f direction = new Vector3f(
                (float) (planar * Math.cos(theta)), (float) polar, (float) (planar * Math.sin(theta)));
            return new Shape.Spawn(new Vector3f(direction).mul((float) radius), direction);
        }, p, Set.of("radius"), "sphere_surface");
    }

    private static Shape circle(JsonObject p) {
        double radius = nonNegative(p, "radius", "circle");
        double thickness = thickness(p, "circle");
        return wrap((random, index, count) -> {
            double theta = 2 * Math.PI * random.nextDouble();
            Vector3f radial = new Vector3f((float) Math.cos(theta), 0, (float) Math.sin(theta));
            double distance = shellRadius(random, radius, thickness, 2);
            return new Shape.Spawn(new Vector3f(radial).mul((float) distance), radial);
        }, p, Set.of("radius", "thickness"), "circle");
    }

    /**
     * Zero-width ring by default. A band is written either as {@code innerRadius}/{@code outerRadius}
     * in blocks, or as {@code thickness} (absolute band width in blocks) centred on {@code radius}.
     * Samples the annulus uniformly by area; {@code arc} sweeps the band instead of the full circle.
     */
    private static Shape ring(JsonObject p, boolean arc) {
        String kind = arc ? "arc" : "ring";
        double radius = nonNegative(p, "radius", kind);
        double arcDegrees = bounded(p, "arcDegrees", 360, kind, 0, 360);
        double inner = radius;
        double outer = radius;
        if (present(p, "innerRadius") || present(p, "outerRadius")) {
            if (present(p, "thickness"))
                throw new IllegalArgumentException("shape.thickness and shape.innerRadius/outerRadius are alternative band forms for kind '" + kind + "'; write one");
            inner = present(p, "innerRadius") ? nonNegative(p, "innerRadius", kind) : radius;
            outer = present(p, "outerRadius") ? nonNegative(p, "outerRadius", kind) : radius;
            if (inner > outer)
                throw new IllegalArgumentException("shape.innerRadius must not exceed shape.outerRadius for kind '" + kind + "', got " + inner + " > " + outer);
        } else if (present(p, "thickness")) {
            double band = nonNegative(p, "thickness", kind);
            inner = Math.max(0, radius - band / 2);
            outer = radius + band / 2;
        }
        final double bandInner = inner;
        final double bandOuter = outer;
        return wrap((random, index, count) -> {
            double fraction = arc
                ? (count <= 1 ? 0 : clamp01((double) index / (count - 1)))
                : random.nextDouble();
            double theta = Math.toRadians(arcDegrees) * fraction;
            Vector3f radial = new Vector3f((float) Math.cos(theta), 0, (float) Math.sin(theta));
            double distance = annulusRadius(random, bandInner, bandOuter);
            return new Shape.Spawn(new Vector3f(radial).mul((float) distance), radial);
        }, p, Set.of("radius", "arcDegrees", "thickness", "innerRadius", "outerRadius"), kind);
    }

    /** Uniform-by-area radius in the annulus {@code [inner, outer]}; a zero-width band returns {@code inner}. */
    private static double annulusRadius(ParticleRandom random, double inner, double outer) {
        double innerSquared = inner * inner, outerSquared = outer * outer;
        if (!(outerSquared > innerSquared)) return inner;
        return Math.sqrt(innerSquared + (outerSquared - innerSquared) * random.nextDouble());
    }

    private static Shape cone(JsonObject p, boolean volume) {
        String kind = volume ? "cone_volume" : "cone";
        double radius = nonNegative(p, "radius", kind);
        double thickness = thickness(p, kind);
        double angleDegrees = bounded(p, "angleDegrees", 30, kind, 0, 180);
        double length = volume ? nonNegative(p, "length", kind) : 0;
        return wrap((random, index, count) -> {
            double theta = 2 * Math.PI * random.nextDouble();
            Vector3f radial = new Vector3f((float) Math.cos(theta), 0, (float) Math.sin(theta));
            double distance = shellRadius(random, radius, thickness, 2);
            double sin = Math.sin(Math.toRadians(angleDegrees));
            double cos = Math.cos(Math.toRadians(angleDegrees));
            Vector3f direction = new Vector3f(radial.x * (float) sin, (float) cos, radial.z * (float) sin);
            Vector3f position = new Vector3f(radial).mul((float) distance);
            if (volume) position.fma((float) (random.nextDouble() * length), direction);
            return new Shape.Spawn(position, direction);
        }, p, volume ? Set.of("radius", "angleDegrees", "thickness", "length") : Set.of("radius", "angleDegrees", "thickness"), kind);
    }

    private static Shape line(JsonObject p) {
        double length = nonNegative(p, "length", "line");
        return wrap((random, index, count) ->
            new Shape.Spawn(new Vector3f(0, (float) (random.nextDouble() * length), 0), new Vector3f(0, 1, 0)),
            p, Set.of("length"), "line");
    }

    private static Shape torus(JsonObject p) {
        double major = nonNegative(p, "radius", "torus");
        double tube = nonNegative(p, "thickness", "torus");
        return wrap((random, index, count) -> {
            double theta = 2 * Math.PI * random.nextDouble();
            Vector3f radial = new Vector3f((float) Math.cos(theta), 0, (float) Math.sin(theta));
            Vector3f offset = new Vector3f();
            Vector3f direction;
            if (tube <= 0) {
                direction = new Vector3f(radial);
            } else {
                double phi = sampleTubeAngle(random, major, tube);
                offset = new Vector3f(radial).mul((float) (tube * Math.cos(phi)));
                offset.y += (float) (tube * Math.sin(phi));
                direction = new Vector3f(offset).normalize();
            }
            Vector3f position = new Vector3f(radial).mul((float) major).add(offset);
            return new Shape.Spawn(position, direction);
        }, p, Set.of("radius", "thickness"), "torus");
    }

    private static Shape cylinder(JsonObject p) {
        double radius = nonNegative(p, "radius", "cylinder");
        double length = nonNegative(p, "length", "cylinder");
        double thickness = thickness(p, "cylinder");
        return wrap((random, index, count) -> {
            double theta = 2 * Math.PI * random.nextDouble();
            Vector3f radial = new Vector3f((float) Math.cos(theta), 0, (float) Math.sin(theta));
            double distance = shellRadius(random, radius, thickness, 2);
            Vector3f position = new Vector3f(radial).mul((float) distance);
            position.y = (float) (random.nextDouble() * length);
            return new Shape.Spawn(position, radial);
        }, p, Set.of("radius", "length", "thickness"), "cylinder");
    }

    // --- sampling helpers ----------------------------------------------------------------------

    /** Uniform radius inside a shell whose inner radius is {@code radius * thickness}. */
    private static double shellRadius(ParticleRandom random, double radius, double thickness, int dimension) {
        double inner = thickness;
        if (dimension == 3) {
            double innerCubed = inner * inner * inner;
            return radius * Math.cbrt(innerCubed + (1 - innerCubed) * random.nextDouble());
        }
        double innerSquared = inner * inner;
        return radius * Math.sqrt(innerSquared + (1 - innerSquared) * random.nextDouble());
    }

    /**
     * Samples the tube angle of a torus proportionally to its surface area element
     * {@code (major + tube * cos(phi))}. Rejection keeps the surface uniform for any radii.
     */
    private static double sampleTubeAngle(ParticleRandom random, double major, double tube) {
        double max = major + Math.abs(tube);
        if (max <= 0) return 0;
        for (int guard = 0; guard < 4096; guard++) {
            double phi = 2 * Math.PI * random.nextDouble();
            if (random.nextDouble() * max <= major + tube * Math.cos(phi)) return phi;
        }
        return 0;
    }

    // --- rotation and direction ----------------------------------------------------------------

    @FunctionalInterface
    private interface Raw {
        Shape.Spawn sample(ParticleRandom random, int index, int count);
    }

    private static Shape wrap(Raw raw, JsonObject p, Set<String> specific, String kind) {
        requireOnly(p, specific, kind);
        double[] rotation = rotation(p, kind);
        double randomDirection = bounded(p, "randomDirection", 0, kind, 0, 1);
        return (random, index, count) -> {
            Shape.Spawn spawn = raw.sample(random, index, count);
            Vector3f position = spawn.position();
            Vector3f direction = spawn.direction();
            rotate(position, rotation[0], rotation[1], rotation[2]);
            rotate(direction, rotation[0], rotation[1], rotation[2]);
            if (randomDirection > 0) {
                Vector3f mix = unitSphere(random);
                direction.mul((float) (1 - randomDirection)).fma((float) randomDirection, mix);
                if (direction.lengthSquared() < 1e-12) direction.set(mix);
            }
            direction.normalize();
            return new Shape.Spawn(position, direction);
        };
    }

    /** Right-handed rotation, applying yaw about Y, then pitch about X, then roll about Z. */
    private static void rotate(Vector3f v, double yawDegrees, double pitchDegrees, double rollDegrees) {
        double yaw = Math.toRadians(yawDegrees);
        double pitch = Math.toRadians(pitchDegrees);
        double roll = Math.toRadians(rollDegrees);
        double cy = Math.cos(yaw), sy = Math.sin(yaw);
        double cp = Math.cos(pitch), sp = Math.sin(pitch);
        double cr = Math.cos(roll), sr = Math.sin(roll);
        double x = v.x * cy + v.z * sy;
        double y = v.y;
        double z = -v.x * sy + v.z * cy;
        double pitchedY = y * cp - z * sp;
        double pitchedZ = y * sp + z * cp;
        v.set((float) (x * cr - pitchedY * sr), (float) (x * sr + pitchedY * cr), (float) pitchedZ);
    }

    private static Vector3f unitSphere(ParticleRandom random) {
        double polar = 2 * random.nextDouble() - 1;
        double theta = 2 * Math.PI * random.nextDouble();
        double planar = Math.sqrt(Math.max(0, 1 - polar * polar));
        return new Vector3f((float) (planar * Math.cos(theta)), (float) polar, (float) (planar * Math.sin(theta)));
    }

    // --- parameter validation and parsing ------------------------------------------------------

    private static void requireOnly(JsonObject p, Set<String> specific, String kind) {
        for (String key : p.keySet()) {
            if ("kind".equals(key) || COMMON.contains(key) || specific.contains(key)) continue;
            var accepted = new java.util.TreeSet<String>(COMMON);
            accepted.addAll(specific);
            throw new IllegalArgumentException(
                "shape." + key + " is not valid for kind '" + kind + "'; accepted keys: " + accepted);
        }
    }

    private static double[] rotation(JsonObject p, String kind) {
        if (!p.has("rotation") || p.get("rotation").isJsonNull()) return new double[] {0, 0, 0};
        JsonElement element = p.get("rotation");
        if (!element.isJsonArray() || element.getAsJsonArray().size() != 3)
            throw new IllegalArgumentException("shape.rotation must be [yaw, pitch, roll] for kind '" + kind + "'");
        JsonArray array = element.getAsJsonArray();
        return new double[] {
            finite(array.get(0), "shape.rotation[0]", kind),
            finite(array.get(1), "shape.rotation[1]", kind),
            finite(array.get(2), "shape.rotation[2]", kind)
        };
    }

    private static double[] vector3(JsonObject p, String key, String kind) {
        JsonElement element = p.get(key);
        if (element == null || element.isJsonNull() || !element.isJsonArray())
            throw new IllegalArgumentException("shape." + key + " must be an array of three numbers for kind '" + kind + "'");
        JsonArray array = element.getAsJsonArray();
        if (array.size() != 3)
            throw new IllegalArgumentException("shape." + key + " must be an array of three numbers for kind '" + kind + "'");
        return new double[] {
            finite(array.get(0), "shape." + key + "[0]", kind),
            finite(array.get(1), "shape." + key + "[1]", kind),
            finite(array.get(2), "shape." + key + "[2]", kind)
        };
    }

    private static boolean present(JsonObject p, String key) {
        return p.has(key) && !p.get(key).isJsonNull();
    }

    private static double thickness(JsonObject p, String kind) {
        return bounded(p, "thickness", 0, kind, 0, 1);
    }

    private static double nonNegative(JsonObject p, String key, String kind) {
        double value = finite(p.get(key), "shape." + key, kind);
        if (value < 0) throw new IllegalArgumentException("shape." + key + " must be non-negative for kind '" + kind + "', got " + value);
        return value;
    }

    private static double bounded(JsonObject p, String key, double fallback, String kind, double min, double max) {
        JsonElement element = p.get(key);
        if (element == null || element.isJsonNull()) return fallback;
        double value = finite(element, "shape." + key, kind);
        if (value < min || value > max)
            throw new IllegalArgumentException("shape." + key + " must be in " + min + ".." + max + " for kind '" + kind + "', got " + value);
        return value;
    }

    private static double finite(JsonElement element, String path, String kind) {
        if (element == null || element.isJsonNull() || !element.isJsonPrimitive() || !element.getAsJsonPrimitive().isNumber())
            throw new IllegalArgumentException(path + " must be a number for kind '" + kind + "'");
        double value = element.getAsDouble();
        if (!Double.isFinite(value)) throw new IllegalArgumentException(path + " must be finite for kind '" + kind + "'");
        return value;
    }

    private static double clamp01(double value) {
        return value < 0 ? 0 : value > 1 ? 1 : value;
    }
}
