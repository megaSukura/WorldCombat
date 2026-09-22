package dev.worldcombat.core.client.particles;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.joml.Vector3f;

/**
 * Pure-logic checks for {@link Shapes}. Owned by the shapes module. Runs without Minecraft and
 * exercises every authored kind, the rotation/random-direction compositing, replay determinism and
 * strict parameter validation.
 */
public final class ShapeChecks {
    private ShapeChecks() {}

    private static final int SAMPLES = 2000;
    private static final double EPS = 1e-6;

    public static void main(String[] args) {
        checkPoint();
        checkBox();
        checkSphere();
        checkSphereDistribution();
        checkHemisphere();
        checkSphereSurface();
        checkCircle();
        checkRing();
        checkArc();
        checkCone();
        checkConeVolume();
        checkLine();
        checkTorus();
        checkCylinder();
        PolygonChecks.main(args);
        checkRotation();
        checkRandomDirection();
        checkReplay();
        checkInvalid();
        System.out.println("ShapeChecks PASS");
    }

    private static void checkPoint() {
        Shape point = shape("point", "{}");
        each(point, 1L, SAMPLES, (index, position, direction) -> {
            if (position.length() > EPS) throw new AssertionError("point position should be the origin: " + position);
            if (Math.abs(direction.x) > EPS || Math.abs(direction.z) > EPS || Math.abs(direction.y - 1) > EPS)
                throw new AssertionError("point direction should be +Y: " + direction);
        });
    }

    private static void checkBox() {
        Shape box = shape("box", "{\"size\":[2,4,6]}");
        each(box, 2L, SAMPLES, (index, position, direction) -> {
            if (Math.abs(position.x) > 1 + EPS || Math.abs(position.y) > 2 + EPS || Math.abs(position.z) > 3 + EPS)
                throw new AssertionError("box position outside size: " + position);
            if (Math.abs(direction.y - 1) > EPS) throw new AssertionError("box direction should be +Y: " + direction);
        });
    }

    private static void checkSphere() {
        Shape solid = shape("sphere", "{\"radius\":1.5}");
        each(solid, 3L, SAMPLES, (index, position, direction) -> {
            double radius = position.length();
            if (radius > 1.5 + EPS) throw new AssertionError("sphere position outside radius: " + radius);
            assertRadial(position, direction, "sphere");
        });

        Shape shell = shape("sphere", "{\"radius\":1.5,\"thickness\":1}");
        each(shell, 4L, SAMPLES, (index, position, direction) -> {
            if (Math.abs(position.length() - 1.5) > 1e-4)
                throw new AssertionError("sphere thickness 1 should only sample the surface: " + position.length());
        });

        Shape half = shape("sphere", "{\"radius\":1.5,\"thickness\":0.5}");
        each(half, 5L, SAMPLES, (index, position, direction) -> {
            double radius = position.length();
            if (radius < 1.5 * 0.5 - 1e-4 || radius > 1.5 + EPS)
                throw new AssertionError("sphere shell radius outside [radius*thickness, radius]: " + radius);
        });
    }

    private static void checkSphereDistribution() {
        Shape sphere = shape("sphere", "{\"radius\":1.0}");
        int count = 8000;
        ParticleRandom random = new ParticleRandom(17L);
        int inner = 0;
        for (int i = 0; i < count; i++) {
            if (sphere.sample(random, i, count).position().length() <= 0.5) inner++;
        }
        double ratio = inner / (double) count;
        if (Math.abs(ratio - 0.125) > 0.03)
            throw new AssertionError("sphere volume should be uniform: P(r<=R/2)=" + ratio);
    }

    private static void checkHemisphere() {
        Shape hemisphere = shape("hemisphere", "{\"radius\":1.5}");
        each(hemisphere, 6L, SAMPLES, (index, position, direction) -> {
            if (position.length() > 1.5 + EPS) throw new AssertionError("hemisphere outside radius: " + position.length());
            if (position.y < -EPS) throw new AssertionError("hemisphere should have y >= 0: " + position);
            if (direction.y < -EPS) throw new AssertionError("hemisphere direction should have y >= 0: " + direction);
            assertRadial(position, direction, "hemisphere");
        });
    }

    private static void checkSphereSurface() {
        Shape surface = shape("sphere_surface", "{\"radius\":1.2}");
        each(surface, 7L, SAMPLES, (index, position, direction) -> {
            if (Math.abs(position.length() - 1.2) > 1e-4)
                throw new AssertionError("sphere_surface position should sit on the sphere: " + position.length());
            assertRadial(position, direction, "sphere_surface");
        });
    }

    private static void checkCircle() {
        Shape solid = shape("circle", "{\"radius\":2.0}");
        each(solid, 8L, SAMPLES, (index, position, direction) -> {
            if (Math.abs(position.y) > EPS) throw new AssertionError("circle position should stay on the XZ plane: " + position);
            if (position.length() > 2.0 + EPS) throw new AssertionError("circle position outside radius: " + position.length());
            assertRadial(position, direction, "circle");
        });

        Shape rim = shape("circle", "{\"radius\":2.0,\"thickness\":1}");
        each(rim, 9L, SAMPLES, (index, position, direction) -> {
            if (Math.abs(position.length() - 2.0) > 1e-4)
                throw new AssertionError("circle thickness 1 should only sample the rim: " + position.length());
        });
    }

    private static void checkRing() {
        Shape ring = shape("ring", "{\"radius\":1.7}");
        each(ring, 10L, SAMPLES, (index, position, direction) -> {
            if (Math.abs(position.length() - 1.7) > 1e-6)
                throw new AssertionError("ring radius should equal radius: " + position.length());
            if (Math.abs(position.y) > EPS) throw new AssertionError("ring position should stay on the XZ plane: " + position);
            assertRadial(position, direction, "ring");
        });
    }

    private static void checkArc() {
        int count = 5;
        Shape arc = shape("arc", "{\"radius\":1.0,\"arcDegrees\":180}");
        ParticleRandom random = new ParticleRandom(11L);
        for (int index = 0; index < count; index++) {
            Shape.Spawn spawn = arc.sample(random, index, count);
            double expected = 180.0 * index / (count - 1);
            double actual = Math.toDegrees(Math.atan2(spawn.position().z, spawn.position().x));
            if (Math.abs(actual - expected) > 1e-3)
                throw new AssertionError("arc index " + index + " expected angle " + expected + " but got " + actual);
            if (Math.abs(spawn.position().length() - 1.0) > EPS)
                throw new AssertionError("arc position should sit on the circle: " + spawn.position().length());
            assertUnit(spawn.direction());
        }

        Shape single = shape("arc", "{\"radius\":1.0,\"arcDegrees\":90}");
        Shape.Spawn spawn = single.sample(new ParticleRandom(12L), 0, 1);
        double actual = Math.toDegrees(Math.atan2(spawn.position().z, spawn.position().x));
        if (Math.abs(actual) > 1e-3) throw new AssertionError("arc count<=1 should take the start: " + actual);
    }

    private static void checkCone() {
        Shape cone = shape("cone", "{\"radius\":1.0,\"angleDegrees\":30}");
        each(cone, 13L, SAMPLES, (index, position, direction) -> {
            double angle = Math.toDegrees(Math.acos(Math.max(-1, Math.min(1, direction.y))));
            if (Math.abs(angle - 30) > 1e-3)
                throw new AssertionError("cone direction should be 30 degrees from +Y: " + angle);
            if (Math.abs(position.y) > EPS) throw new AssertionError("cone base should sit on the XZ plane: " + position);
            if (position.length() > 1.0 + EPS) throw new AssertionError("cone base outside radius: " + position.length());
        });

        Shape rim = shape("cone", "{\"radius\":1.0,\"angleDegrees\":30,\"thickness\":1}");
        each(rim, 14L, SAMPLES, (index, position, direction) -> {
            if (Math.abs(position.length() - 1.0) > 1e-4)
                throw new AssertionError("cone thickness 1 should only sample the base rim: " + position.length());
        });
    }

    private static void checkConeVolume() {
        Shape cone = shape("cone_volume", "{\"radius\":1.0,\"angleDegrees\":45,\"length\":2.0}");
        double cos = Math.cos(Math.toRadians(45));
        double sin = Math.sin(Math.toRadians(45));
        each(cone, 15L, SAMPLES, (index, position, direction) -> {
            double angle = Math.toDegrees(Math.acos(Math.max(-1, Math.min(1, direction.y))));
            if (Math.abs(angle - 45) > 1e-3)
                throw new AssertionError("cone_volume direction should be 45 degrees from +Y: " + angle);
            if (position.y < -EPS || position.y > 2.0 * cos + 1e-4)
                throw new AssertionError("cone_volume height outside 0..length: " + position.y);
            double planar = Math.sqrt(position.x * position.x + position.z * position.z);
            if (planar > 1.0 + 2.0 * sin + 1e-4)
                throw new AssertionError("cone_volume radial extent outside the swept cone: " + planar);
        });
    }

    private static void checkLine() {
        Shape line = shape("line", "{\"length\":3.0}");
        each(line, 16L, SAMPLES, (index, position, direction) -> {
            if (Math.abs(position.x) > EPS || Math.abs(position.z) > EPS)
                throw new AssertionError("line position should stay on the Y axis: " + position);
            if (position.y < -EPS || position.y > 3.0 + EPS)
                throw new AssertionError("line position outside 0..length: " + position.y);
            if (Math.abs(direction.y - 1) > EPS) throw new AssertionError("line direction should be +Y: " + direction);
        });
    }

    private static void checkTorus() {
        double major = 2.0;
        double tube = 0.4;
        Shape torus = shape("torus", "{\"radius\":2.0,\"thickness\":0.4}");
        each(torus, 18L, SAMPLES, (index, position, direction) -> {
            double theta = Math.atan2(position.z, position.x);
            double centerX = major * Math.cos(theta);
            double centerZ = major * Math.sin(theta);
            double dx = position.x - centerX;
            double dy = position.y;
            double dz = position.z - centerZ;
            double distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (Math.abs(distance - tube) > 1e-4)
                throw new AssertionError("torus point should sit a tube radius from the centre circle: " + distance);
        });
    }

    private static void checkCylinder() {
        Shape cylinder = shape("cylinder", "{\"radius\":1.5,\"length\":3.0}");
        each(cylinder, 19L, SAMPLES, (index, position, direction) -> {
            double planar = Math.sqrt(position.x * position.x + position.z * position.z);
            if (planar > 1.5 + EPS) throw new AssertionError("cylinder radial extent outside radius: " + planar);
            if (position.y < -EPS || position.y > 3.0 + EPS)
                throw new AssertionError("cylinder height outside 0..length: " + position.y);
            if (Math.abs(direction.y) > EPS) throw new AssertionError("cylinder direction should be radial: " + direction);
        });

        Shape shell = shape("cylinder", "{\"radius\":1.5,\"length\":3.0,\"thickness\":1}");
        each(shell, 20L, SAMPLES, (index, position, direction) -> {
            double planar = Math.sqrt(position.x * position.x + position.z * position.z);
            if (Math.abs(planar - 1.5) > 1e-4)
                throw new AssertionError("cylinder thickness 1 should only sample the wall: " + planar);
        });
    }

    private static void checkRotation() {
        Shape base = shape("arc", "{\"radius\":1.0,\"arcDegrees\":0}");
        Shape.Spawn plain = base.sample(new ParticleRandom(21L), 0, 1);
        if (Math.abs(plain.direction().x - 1) > EPS)
            throw new AssertionError("arcDegrees 0 should start along +X: " + plain.direction());

        Shape rotated = shape("arc", "{\"radius\":1.0,\"arcDegrees\":0,\"rotation\":[90,0,0]}");
        Shape.Spawn spawn = rotated.sample(new ParticleRandom(21L), 0, 1);
        if (Math.abs(spawn.direction().x) > 1e-5 || Math.abs(spawn.direction().y) > 1e-5 || Math.abs(spawn.direction().z + 1) > 1e-5)
            throw new AssertionError("rotation [90,0,0] should map +X to -Z: " + spawn.direction());
        if (Math.abs(spawn.position().x) > 1e-5 || Math.abs(spawn.position().z + 1) > 1e-5)
            throw new AssertionError("rotation should rotate the position too: " + spawn.position());
    }

    private static void checkRandomDirection() {
        Shape mixed = shape("line", "{\"length\":1.0,\"randomDirection\":1}");
        int count = 2000;
        ParticleRandom random = new ParticleRandom(22L);
        double sumY = 0;
        double minY = 1;
        double maxY = -1;
        for (int i = 0; i < count; i++) {
            Vector3f direction = mixed.sample(random, i, count).direction();
            sumY += direction.y;
            minY = Math.min(minY, direction.y);
            maxY = Math.max(maxY, direction.y);
        }
        double mean = sumY / count;
        if (Math.abs(mean) > 0.1) throw new AssertionError("randomDirection 1 should be isotropic, mean y=" + mean);
        if (minY > -0.2 || maxY < 0.2) throw new AssertionError("randomDirection 1 should cover the sphere: " + minY + ".." + maxY);
    }

    private static void checkReplay() {
        Shape sphere = shape("sphere", "{\"radius\":1.3,\"thickness\":0.2,\"rotation\":[15,25,35],\"randomDirection\":0.4}");
        ParticleRandom first = new ParticleRandom(1234567L);
        ParticleRandom second = new ParticleRandom(1234567L);
        for (int i = 0; i < 500; i++) {
            Shape.Spawn a = sphere.sample(first, i, 500);
            Shape.Spawn b = sphere.sample(second, i, 500);
            if (!a.position().equals(b.position()) || !a.direction().equals(b.direction()))
                throw new AssertionError("same seed produced a different sample at index " + i);
        }
    }

    private static void checkInvalid() {
        expectInvalid("sphere", "{}", "shape.radius");
        expectInvalid("sphere", "{\"radius\":1,\"bogus\":3}", "shape.bogus");
        expectInvalid("sphere", "{\"radius\":1,\"thickness\":2}", "shape.thickness");
        expectInvalid("sphere", "{\"radius\":-1}", "shape.radius");
        expectInvalid("ring", "{\"radius\":1,\"arcDegrees\":400}", "shape.arcDegrees");
        expectInvalid("cone", "{\"radius\":1,\"angleDegrees\":200}", "shape.angleDegrees");
        expectInvalid("box", "{}", "shape.size");
        expectInvalid("line", "{}", "shape.length");
        expectInvalid("point", "{\"randomDirection\":1.5}", "shape.randomDirection");
        expectInvalid("point", "{\"rotation\":[1,2]}", "shape.rotation");
        expectInvalid("blob", "{}", "shape.kind");
        expectInvalid("sphere", null, "shape.radius");
        expectInvalid("box", "{\"size\":[1,2,\"x\"]}", "shape.size[2]");
    }

    // --- helpers -------------------------------------------------------------------------------

    @FunctionalInterface
    private interface SampleCheck {
        void accept(int index, Vector3f position, Vector3f direction);
    }

    private static void each(Shape shape, long seed, int count, SampleCheck check) {
        ParticleRandom random = new ParticleRandom(seed);
        for (int index = 0; index < count; index++) {
            Shape.Spawn spawn = shape.sample(random, index, count);
            Vector3f position = spawn.position();
            Vector3f direction = spawn.direction();
            if (!isFinite(position) || !isFinite(direction))
                throw new AssertionError("spawn produced a non-finite value: " + spawn);
            assertUnit(direction);
            check.accept(index, position, direction);
        }
    }

    private static void assertUnit(Vector3f direction) {
        double length = direction.length();
        if (Math.abs(length - 1) > 1e-5) throw new AssertionError("direction should be a unit vector: " + length);
    }

    private static void assertRadial(Vector3f position, Vector3f direction, String kind) {
        if (position.lengthSquared() < 1e-12) return;
        double dot = position.dot(direction) / (position.length() * direction.length());
        if (Math.abs(dot - 1) > 1e-4)
            throw new AssertionError(kind + " direction should equal the normalized position: " + dot);
    }

    private static boolean isFinite(Vector3f value) {
        return Float.isFinite(value.x) && Float.isFinite(value.y) && Float.isFinite(value.z);
    }

    private static Shape shape(String kind, String json) {
        return Shapes.of(kind, json == null ? null : json(json));
    }

    private static JsonObject json(String text) {
        return JsonParser.parseString(text).getAsJsonObject();
    }

    private static void expectInvalid(String kind, String json, String fragment) {
        try {
            Shapes.of(kind, json == null ? null : json(json));
        } catch (IllegalArgumentException expected) {
            String message = expected.getMessage();
            if (message == null || !message.contains(fragment))
                throw new AssertionError("error for kind '" + kind + "' lacks '" + fragment + "': " + message);
            return;
        }
        throw new AssertionError("expected IllegalArgumentException for kind '" + kind + "' with " + json);
    }
}
