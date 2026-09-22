package dev.worldcombat.core.client.particles;

/**
 * Aggregates the particle engine's pure-logic checks into one Gradle task (`particleChecks`).
 * Each module ships its own `*Checks` class with a `main`; the integrator adds it here.
 */
public final class ParticleChecks {
    private ParticleChecks() {}

    public static void main(String[] args) {
        run("skeleton", SkeletonChecks::main);
        run("values", ValueChecks::main);
        run("shapes", ShapeChecks::main);
        run("parser", ParserChecks::main);
        run("bindings", BindingChecks::main);
        run("emitter", EmitterChecks::main);
        run("madparticle-mapping", MadParticleMappingChecks::main);
        run("instance", InstanceChecks::main);
        run("local-entry", LocalEntryChecks::main);
        System.out.println("particleChecks: all check groups passed");
    }

    private static void run(String name, java.util.function.Consumer<String[]> check) {
        try { check.accept(new String[0]); System.out.println("particleChecks: " + name + " ok"); }
        catch (RuntimeException | AssertionError failure) { throw new AssertionError("particleChecks: " + name + " failed: " + failure.getMessage(), failure); }
    }
}
