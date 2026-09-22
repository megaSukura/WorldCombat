package dev.worldcombat.core.client.particles;

import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

/**
 * Pure-logic checks for the values module: the {@link Value} factories, {@link Values#read},
 * {@link ColorGradient} and {@link ParticleRandom}. Owned by the values wave.
 */
public final class ValueChecks {
    private ValueChecks() {}

    public static void main(String[] args) {
        values();
        read();
        colors();
        random();
        System.out.println("ValueChecks PASS");
    }

    private static void values() {
        Value constant = Values.constant(3.5);
        close(constant.sample(0, 0), 3.5, "constant life 0");
        close(constant.sample(0.5, 0.5), 3.5, "constant life 0.5");
        close(constant.sample(1, 1), 3.5, "constant life 1");

        Value range = Values.range(10, 20);
        close(range.sample(0, 0), 10, "range random 0");
        close(range.sample(0.5, 0.25), 12.5, "range random 0.25");
        close(range.sample(1, 0.5), 15, "range random 0.5");
        close(range.sample(0.3, 1), 20, "range random 1");
        expectIllegal(() -> Values.range(5, 1), "range min > max");

        Value curve = Values.curve(new double[][] {{0, 0}, {0.5, 10}, {1, 2}});
        close(curve.sample(0, 0), 0, "curve life 0");
        close(curve.sample(0.5, 0.25), 10, "curve life 0.5");
        close(curve.sample(1, 1), 2, "curve life 1");
        close(curve.sample(0.25, 0), 5, "curve quarter");
        close(curve.sample(0.75, 0), 6, "curve three-quarter");
        close(curve.sample(-3, 0), 0, "curve clamps below");
        close(curve.sample(4, 0), 2, "curve clamps above");
        expectIllegal(() -> Values.curve(new double[][] {{1, 0}, {0, 1}}), "curve descends in t");
        expectIllegal(() -> Values.curve(new double[][] {{1.5, 0}}), "curve t out of range");
        expectIllegal(() -> Values.curve(new double[][] {}), "curve without points");

        Value randomCurve = Values.randomCurve(new double[][] {{0, 0}, {1, 0}}, new double[][] {{0, 10}, {1, 20}});
        close(randomCurve.sample(0, 0), 0, "randomCurve life 0 random 0");
        close(randomCurve.sample(0, 0.25), 2.5, "randomCurve life 0 random 0.25");
        close(randomCurve.sample(0.5, 0.5), 7.5, "randomCurve life 0.5 random 0.5");
        close(randomCurve.sample(0.5, 1), 15, "randomCurve life 0.5 random 1");
        close(randomCurve.sample(1, 0.25), 5, "randomCurve life 1 random 0.25");
        close(randomCurve.sample(1, 1), 20, "randomCurve life 1 random 1");
    }

    private static void read() {
        close(Values.read(json("4.5"), "v").sample(0.2, 0.3), 4.5, "read constant");

        Value range = Values.read(json("[2, 8]"), "v");
        close(range.sample(0, 0), 2, "read range random 0");
        close(range.sample(0, 0.5), 5, "read range random 0.5");
        close(range.sample(0, 1), 8, "read range random 1");

        Value curve = Values.read(json("{\"curve\": [[0, 0], [0.5, 10], [1, 2]]}"), "v");
        close(curve.sample(0, 0), 0, "read curve life 0");
        close(curve.sample(0.5, 0), 10, "read curve life 0.5");
        close(curve.sample(1, 0), 2, "read curve life 1");

        Value random = Values.read(json("{\"curve\": [[0,0],[1,0]], \"random\": [[0,10],[1,10]]}"), "v");
        close(random.sample(0.5, 0), 0, "read randomCurve random 0");
        close(random.sample(0.5, 0.5), 5, "read randomCurve random 0.5");
        close(random.sample(0.5, 1), 10, "read randomCurve random 1");

        failRead("\"oops\"");
        failRead("true");
        failRead("null");
        failRead("[]");
        failRead("[1]");
        failRead("[5, 1]");
        failRead("[1, \"2\"]");
        failRead("[1, 2, 3]");
        failRead("{}");
        failRead("{\"curve\": []}");
        failRead("{\"curve\": [[0, 0]], \"foo\": 1}");
        failRead("{\"random\": [[0, 0], [1, 1]]}");
        failRead("{\"curve\": [[1.5, 0]]}");
        failRead("{\"curve\": [[0.5, 0], [0.2, 1]]}");
        failRead("{\"curve\": [[0, 0, 1]]}");
        failRead("{\"curve\": \"nope\"}");
    }

    private static void colors() {
        ColorGradient ramp = ColorGradient.of(new double[] {0, 1}, new int[] {0x000000, 0xFFFFFF}, -1);
        eq(ramp.rgb(0), 0x000000, "ramp start");
        eqWithin(ramp.rgb(0.5), 0x808080, 1, "ramp midpoint");
        eq(ramp.rgb(1), 0xFFFFFF, "ramp end");
        eq(ramp.argb(0.5), 0xFF000000 | ramp.rgb(0.5), "argb packs opaque");

        ColorGradient tinted = ColorGradient.of(0x808080).withTint(0x808080);
        eq(tinted.rgb(0.5), 0x404040, "tint multiplies channels");
        if (ColorGradient.of(0x808080).withTint(-1).tint() != -1) throw new AssertionError("withTint(-1) should keep no tint");
        eq(ColorGradient.of(0x808080).withTint(0xFFFFFF).rgb(0.5), 0x808080, "white tint is identity");

        eq(ColorGradient.read(json("6737151"), "c").rgb(0), 0x66CCFF, "read decimal colour");
        eq(ColorGradient.read(json("\"#66CCFF\""), "c").rgb(0), 0x66CCFF, "read #RRGGBB colour");
        eq(ColorGradient.read(json("\"66CCFF\""), "c").rgb(0), 0x66CCFF, "read bare hex colour");

        ColorGradient readRamp = ColorGradient.read(json("{\"gradient\": [[0, 0], [0.5, 6737151], [1, 16777215]]}"), "c");
        eq(readRamp.rgb(0), 0x000000, "read gradient start");
        eq(readRamp.rgb(0.5), 0x66CCFF, "read gradient middle");
        eq(readRamp.rgb(1), 0xFFFFFF, "read gradient end");

        failColor("\"#XYZ123\"");
        failColor("\"#12345\"");
        failColor("{}");
        failColor("{\"gradient\": []}");
        failColor("{\"gradient\": [[1.5, 0]]}");
        failColor("{\"gradient\": [[0.5, 0], [0.2, 1]]}");
        failColor("{\"gradient\": [[0, 0]], \"tint\": 1}");
        failColor("{\"gradient\": [[0, 0, 1]]}");
    }

    private static void random() {
        ParticleRandom first = new ParticleRandom(1234L);
        ParticleRandom second = new ParticleRandom(1234L);
        for (int i = 0; i < 64; i++) {
            if (first.nextDouble() != second.nextDouble()) throw new AssertionError("same seed diverged at " + i);
        }

        ParticleRandom forked = new ParticleRandom(99L);
        if (forked.fork(1).nextDouble() == forked.fork(2).nextDouble()) throw new AssertionError("forks should be independent");

        ParticleRandom parentA = new ParticleRandom(7L);
        ParticleRandom parentB = new ParticleRandom(7L);
        parentA.nextDouble();
        parentB.nextDouble();
        ParticleRandom childA = parentA.fork(3);
        ParticleRandom childB = parentB.fork(3);
        if (parentA.nextDouble() != parentB.nextDouble()) throw new AssertionError("fork advanced the parent stream");
        if (childA.nextDouble() != childB.nextDouble()) throw new AssertionError("fork is not replayable");

        ParticleRandom stream = new ParticleRandom(555L);
        for (int i = 0; i < 1000; i++) {
            int value = stream.nextInt(7);
            if (value < 0 || value >= 7) throw new AssertionError("nextInt out of range: " + value);
        }
        expectIllegal(() -> stream.nextInt(0), "nextInt bound must be positive");
        for (int i = 0; i < 1000; i++) {
            double value = stream.nextDouble();
            if (!(value >= 0 && value < 1)) throw new AssertionError("nextDouble out of range: " + value);
            float small = stream.nextFloat();
            if (!(small >= 0 && small < 1)) throw new AssertionError("nextFloat out of range: " + small);
            if (!Double.isFinite(stream.nextGaussian())) throw new AssertionError("nextGaussian not finite");
        }

        ParticleRandom gaussA = new ParticleRandom(5L);
        ParticleRandom gaussB = new ParticleRandom(5L);
        for (int i = 0; i < 20; i++) {
            if (gaussA.nextGaussian() != gaussB.nextGaussian()) throw new AssertionError("gaussian pair not replayable at " + i);
        }
    }

    private static JsonElement json(String text) {
        return JsonParser.parseString(text);
    }

    private static void close(double actual, double expected, String label) {
        if (Math.abs(actual - expected) > 1e-9) throw new AssertionError(label + ": expected " + expected + " got " + actual);
    }

    private static void eq(int actual, int expected, String label) {
        if (actual != expected) throw new AssertionError(label + ": expected " + Integer.toHexString(expected) + " got " + Integer.toHexString(actual));
    }

    private static void eqWithin(int actual, int expected, int tolerance, String label) {
        int r = Math.abs(((actual >> 16) & 0xFF) - ((expected >> 16) & 0xFF));
        int g = Math.abs(((actual >> 8) & 0xFF) - ((expected >> 8) & 0xFF));
        int b = Math.abs((actual & 0xFF) - (expected & 0xFF));
        if (r > tolerance || g > tolerance || b > tolerance) throw new AssertionError(label + ": expected " + Integer.toHexString(expected) + " got " + Integer.toHexString(actual));
    }

    private static void failRead(String text) {
        expectPath(() -> Values.read(json(text), "v"), text, "Values.read");
    }

    private static void failColor(String text) {
        expectPath(() -> ColorGradient.read(json(text), "v"), text, "ColorGradient.read");
    }

    private static void expectPath(Runnable action, String text, String label) {
        try {
            action.run();
        } catch (IllegalArgumentException error) {
            if (error.getMessage() == null || !error.getMessage().contains("v")) throw new AssertionError(label + " error lacks path for " + text + ": " + error.getMessage());
            return;
        }
        throw new AssertionError(label + " should reject " + text);
    }

    private static void expectIllegal(Runnable action, String label) {
        try {
            action.run();
        } catch (IllegalArgumentException expected) {
            return;
        }
        throw new AssertionError("expected IllegalArgumentException: " + label);
    }
}
