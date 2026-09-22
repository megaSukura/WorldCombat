package dev.worldcombat.core.client.particles;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import org.joml.Vector2f;
import org.joml.Vector3f;

/**
 * Strict parser for the authored definition format v2. Every unknown field, out-of-range value and
 * missing required field throws {@link IllegalArgumentException} naming the JSON path as
 * {@code <id>@<version> <json.path>: <reason>}. Owned by the model/parser module.
 */
public final class DefinitionParser {
    private DefinitionParser() {}

    private static final Pattern MOMENT_NAME = Pattern.compile("[a-z0-9_]+");
    private static final Pattern ID_PATTERN = Pattern.compile("[a-z0-9_.-]+:[a-z0-9_./-]+");
    private static final int MAX_EXPRESSION = 256;

    private static final Map<String, ParticleDefinition.Bind> BINDS =
        Map.of("source", ParticleDefinition.Bind.SOURCE, "target", ParticleDefinition.Bind.TARGET,
            "projectile", ParticleDefinition.Bind.PROJECTILE, "point", ParticleDefinition.Bind.POINT,
            "path", ParticleDefinition.Bind.PATH);
    private static final Map<String, ParticleDefinition.Fit> FITS = Map.of("body", ParticleDefinition.Fit.BODY, "none", ParticleDefinition.Fit.NONE);
    private static final Map<String, ParticleDefinition.Orient> ORIENTS = Map.of(
        "fixed", ParticleDefinition.Orient.FIXED, "direction", ParticleDefinition.Orient.DIRECTION,
        "toward", ParticleDefinition.Orient.TOWARD, "velocity", ParticleDefinition.Orient.VELOCITY);
    private static final Map<String, ParticleDefinition.Direction> DIRECTIONS = Map.ofEntries(
        Map.entry("shape", ParticleDefinition.Direction.SHAPE), Map.entry("up", ParticleDefinition.Direction.UP),
        Map.entry("down", ParticleDefinition.Direction.DOWN), Map.entry("outward", ParticleDefinition.Direction.OUTWARD),
        Map.entry("inward", ParticleDefinition.Direction.INWARD), Map.entry("toward", ParticleDefinition.Direction.TOWARD),
        Map.entry("away", ParticleDefinition.Direction.AWAY), Map.entry("velocity", ParticleDefinition.Direction.VELOCITY));
    private static final Map<String, ParticleDefinition.RenderMode> RENDER_MODES = Map.of(
        "instanced", ParticleDefinition.RenderMode.INSTANCED,
        "translucent", ParticleDefinition.RenderMode.TRANSLUCENT,
        "opaque", ParticleDefinition.RenderMode.OPAQUE,
        "lit", ParticleDefinition.RenderMode.LIT);
    private static final Map<String, ParticleDefinition.ChangeMode> CHANGE_MODES = Map.of(
        "linear", ParticleDefinition.ChangeMode.LINEAR,
        "index", ParticleDefinition.ChangeMode.INDEX,
        "sin", ParticleDefinition.ChangeMode.SIN);
    private static final Map<String, ParticleDefinition.SpriteFrom> SPRITE_SOURCES =
        Map.of("random", ParticleDefinition.SpriteFrom.RANDOM, "age", ParticleDefinition.SpriteFrom.AGE);
    private static final Map<String, ParticleDefinition.ExitMode> EXIT_MODES =
        Map.of("drain", ParticleDefinition.ExitMode.DRAIN, "hide", ParticleDefinition.ExitMode.HIDE);
    private static final Map<String, ParticleDefinition.ChildTrigger> CHILD_TRIGGERS = Map.of(
        "birth", ParticleDefinition.ChildTrigger.BIRTH,
        "event", ParticleDefinition.ChildTrigger.EVENT);

    private static final Set<String> ROOT_KEYS = Set.of("moments", "interrupt");
    private static final Set<String> MOMENT_KEYS = Set.of("duration", "exit", "emitters", "children");
    private static final Set<String> EXIT_KEYS = Set.of("stop", "drain");
    private static final Set<String> CHILD_KEYS = Set.of("on", "of", "event", "emit");
    private static final Set<String> BURST_KEYS = Set.of("count", "interval", "repeats", "at");
    private static final Set<String> TRAIL_KEYS = Set.of("minDistance");
    private static final Set<String> VELOCITY_KEYS = Set.of("x", "y", "z");
    private static final Set<String> COLLISION_KEYS = Set.of(
        "bounces", "horizontalSpread", "verticalBounce", "dragAfter", "gravityAfter", "deflectionAfter", "disappearAt");
    private static final Set<String> INTERACT_KEYS = Set.of("horizontal", "vertical");
    private static final Set<String> CHILD_PARTICLE_KEYS = Set.of(
        "particle", "spriteFrom", "lifetime", "lifeJitter", "size", "sizeMode", "color", "alpha", "alphaMode",
        "spin", "gravity", "drag", "deflection", "velocity", "collision", "render", "light", "bloom", "amount",
        "positionJitter", "velocityJitter", "child");
    private static final Set<String> EMITTER_KEYS = Set.of(
        "name", "particle", "spriteFrom", "bind", "offset", "height", "fit", "orient", "trail", "start", "stop", "rate", "burst",
        "shape", "speed", "spread", "direction", "amount", "positionJitter", "velocityJitter", "lifetime",
        "lifeJitter", "size", "sizeMode", "color", "alpha", "alphaMode", "roll", "spin", "gravity", "drag",
        "deflection", "velocity", "collision", "interact", "render", "light", "alwaysRender", "bloom",
        "preCalculate", "reverse", "child", "maxParticles");

    /**
     * Parses one authored definition.
     *
     * @param id      unit id, used only for error messages
     * @param version definition version, at least 1
     * @param json    the definition object (never null)
     * @return the immutable model with all defaults resolved
     * @throws IllegalArgumentException if any value is unknown, out of range or missing
     */
    public static ParticleDefinition parse(String id, int version, JsonElement json) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("id is required");
        if (version < 1) throw new IllegalArgumentException("version must be at least 1, got " + version);
        if (json == null || !json.isJsonObject())
            throw new IllegalArgumentException(id + "@" + version + ": expected a definition object");
        var bindings = new DefinitionBindings(id, version, json.getAsJsonObject());
        if (bindings.empty()) return parseResolved(id, version, json.getAsJsonObject());
        var defaults = bindings.resolve(new JsonObject());
        return new ParticleDefinition(defaults.moments(), defaults.interrupt(), bindings);
    }

    static ParticleDefinition parseResolved(String id, int version, JsonObject json) {
        return new Parser(id, version, false, Set.of()).definition(json);
    }

    /**
     * Resolves a materialized definition. {@code boundDirection} is true when the JSON came from a
     * payload-resolved binding, so a data-driven direction that collapsed to the zero vector falls
     * back to a safe axis instead of rejecting the whole definition.
     */
    static ParticleDefinition parseResolved(String id, int version, JsonObject json, boolean boundDirection) {
        return new Parser(id, version, boundDirection, Set.of()).definition(json);
    }

    /**
     * Resolves a materialized definition and names the JSON paths that came from a payload binding.
     * A materialized value on one of those paths may be fractional where a script computed it, so an
     * integer leaf rounds it instead of rejecting the definition; authored JSON still must be exact.
     */
    static ParticleDefinition parseResolved(
        String id, int version, JsonObject json, boolean boundDirection, Set<String> boundPaths) {
        return new Parser(id, version, boundDirection, boundPaths).definition(json);
    }

    private static final class Parser {
        private final String header;
        private final boolean boundDirection;
        private final Set<String> boundPaths;

        Parser(String id, int version, boolean boundDirection, Set<String> boundPaths) {
            this.header = id + "@" + version;
            this.boundDirection = boundDirection;
            this.boundPaths = boundPaths == null ? Set.of() : boundPaths;
        }

        ParticleDefinition definition(JsonObject root) {
            requireOnly(root, ROOT_KEYS, "");
            JsonElement momentsElement = requirePresent(root, "moments", "");
            if (!momentsElement.isJsonObject()) throw error("moments", "expected object");
            JsonObject momentsJson = momentsElement.getAsJsonObject();
            Map<String, ParticleDefinition.Moment> moments = new LinkedHashMap<>();
            for (String name : momentsJson.keySet()) {
                if (!MOMENT_NAME.matcher(name).matches())
                    throw error("moments." + name, "moment name must match [a-z0-9_]+");
                moments.put(name, moment(name, momentsJson.get(name)));
            }
            if (moments.isEmpty()) throw error("moments", "requires at least one moment");
            ParticleDefinition.ExitMode interrupt = ParticleDefinition.ExitMode.DRAIN;
            if (present(root, "interrupt"))
                interrupt = enumValue(root.get("interrupt"), "interrupt", EXIT_MODES);
            return new ParticleDefinition(moments, interrupt);
        }

        private ParticleDefinition.Moment moment(String name, JsonElement element) {
            String path = "moments." + name;
            JsonObject obj = requireObject(element, path);
            requireOnly(obj, MOMENT_KEYS, path);
            int duration = intDefault(obj, "duration", 0, path, 0);
            int stop = duration;
            int drain = 40;
            if (present(obj, "exit")) {
                String exitPath = path + ".exit";
                JsonObject exit = requireObject(obj.get("exit"), exitPath);
                requireOnly(exit, EXIT_KEYS, exitPath);
                stop = intDefault(exit, "stop", duration, exitPath, 0);
                drain = intDefault(exit, "drain", 40, exitPath, 0);
            }
            JsonArray emittersJson = requireArray(obj, "emitters", path);
            if (emittersJson.isEmpty()) throw error(path + ".emitters", "requires at least one emitter");
            Set<String> emitterNames = new LinkedHashSet<>();
            List<ParticleDefinition.EmitterSpec> emitters = new ArrayList<>(emittersJson.size());
            for (int i = 0; i < emittersJson.size(); i++) {
                String emitterPath = path + ".emitters[" + i + "]";
                emitters.add(emitter(requireObject(emittersJson.get(i), emitterPath), emitterPath, stop, false, emitterNames));
            }
            List<ParticleDefinition.ChildSpec> children = List.of();
            if (present(obj, "children")) {
                JsonElement childrenElement = obj.get("children");
                if (!childrenElement.isJsonArray()) throw error(path + ".children", "expected array");
                JsonArray childrenJson = childrenElement.getAsJsonArray();
                List<ParticleDefinition.ChildSpec> parsed = new ArrayList<>(childrenJson.size());
                for (int i = 0; i < childrenJson.size(); i++) {
                    parsed.add(child(childrenJson.get(i), path + ".children[" + i + "]", stop, emitterNames));
                }
                children = parsed;
            }
            return new ParticleDefinition.Moment(duration, stop, drain, emitters, children);
        }

        private ParticleDefinition.EmitterSpec emitter(
            JsonObject obj, String path, int momentStop, boolean childEmitter, Set<String> names) {
            requireOnly(obj, EMITTER_KEYS, path);
            String name = requireString(obj, "name", path);
            if (name.isBlank()) throw error(path + ".name", "required");
            if (!names.add(name)) throw error(path + ".name", "duplicate emitter name '" + name + "'");

            String particle = requireString(obj, "particle", path);
            if (!ID_PATTERN.matcher(particle).matches())
                throw error(path + ".particle",
                    "expected namespace:path matching [a-z0-9_.-]+:[a-z0-9_./-]+, got '" + particle + "'");

            ParticleDefinition.SpriteFrom spriteFrom =
                enumDefault(obj, "spriteFrom", path, SPRITE_SOURCES, ParticleDefinition.SpriteFrom.AGE);
            ParticleDefinition.Bind bind = childEmitter
                ? ParticleDefinition.Bind.POINT
                : enumDefault(obj, "bind", path, BINDS, ParticleDefinition.Bind.SOURCE);
            Vector3f offset = present(obj, "offset") ? vector(obj.get("offset"), path + ".offset") : new Vector3f();
            double height = finiteDefault(obj, "height", 0.5, path);
            ParticleDefinition.Fit fit = enumDefault(obj, "fit", path, FITS, null);
            ParticleDefinition.Orient orient = enumDefault(obj, "orient", path, ORIENTS, ParticleDefinition.Orient.FIXED);

            Double trailMinDistance = null;
            if (present(obj, "trail")) {
                String trailPath = path + ".trail";
                if (childEmitter) throw error(trailPath, "child emitters cannot have a trail");
                JsonObject trail = requireObject(obj.get("trail"), trailPath);
                requireOnly(trail, TRAIL_KEYS, trailPath);
                double distance = requireFinite(trail, "minDistance", trailPath);
                if (!(distance > 0)) throw error(trailPath + ".minDistance", "must be greater than 0");
                trailMinDistance = distance;
            }

            int start = intDefault(obj, "start", 0, path, 0);
            int stop = intDefault(obj, "stop", momentStop, path, 0);
            if (stop > 0 && start > stop)
                throw error(path + ".start", "must not exceed stop (" + start + " > " + stop + ")");

            Value rate = present(obj, "rate") ? external(() -> Values.read(obj.get("rate"), path + ".rate")) : null;
            ParticleDefinition.BurstSpec burst = present(obj, "burst") ? burst(obj.get("burst"), path + ".burst") : null;
            if (rate == null && burst == null) throw error(path, "requires rate or burst");

            JsonElement lifetimeElement = requirePresent(obj, "lifetime", path);
            Value lifetime = external(() -> Values.read(lifetimeElement, path + ".lifetime"));

            Shape shape = Shapes.point();
            if (present(obj, "shape")) {
                String shapePath = path + ".shape";
                JsonObject shapeObject = requireObject(obj.get("shape"), shapePath);
                String kind = requireString(shapeObject, "kind", shapePath);
                try {
                    shape = Shapes.of(kind, shapeObject);
                } catch (IllegalArgumentException failure) {
                    throw error(shapePath, failure.getMessage());
                }
            }

            if (shape instanceof Shapes.PathShape && bind != ParticleDefinition.Bind.PATH)
                throw error(path + ".shape", "kind '" + ((Shapes.PathShape) shape).kind() + "' needs bind 'path'");
            if (bind == ParticleDefinition.Bind.PATH && !(shape instanceof Shapes.PathShape))
                throw error(path + ".shape", "bind 'path' needs shape kind 'polyline' or 'polygon'");

            Value speed = present(obj, "speed") ? external(() -> Values.read(obj.get("speed"), path + ".speed")) : null;
            Value spread = present(obj, "spread") ? external(() -> Values.read(obj.get("spread"), path + ".spread")) : null;

            ParticleDefinition.Direction direction = ParticleDefinition.Direction.SHAPE;
            Vector3f fixedDirection = null;
            if (present(obj, "direction")) {
                JsonElement directionElement = obj.get("direction");
                if (directionElement.isJsonArray()) {
                    Vector3f vector = vector(directionElement, path + ".direction");
                    direction = ParticleDefinition.Direction.FIXED;
                    if (vector.lengthSquared() < 1e-12f) {
                        if (!boundDirection)
                            throw error(path + ".direction", "fixed direction must not be the zero vector");
                        // A data-bound axis defaulted to zero; the runtime falls back to +Y.
                        fixedDirection = null;
                    } else {
                        vector.normalize();
                        fixedDirection = vector;
                    }
                } else {
                    direction = enumValue(directionElement, path + ".direction", DIRECTIONS);
                }
            }

            int amount = intDefault(obj, "amount", 1, path, 1);
            Vector3f positionJitter = present(obj, "positionJitter")
                ? vector(obj.get("positionJitter"), path + ".positionJitter") : null;
            Vector3f velocityJitter = present(obj, "velocityJitter")
                ? vector(obj.get("velocityJitter"), path + ".velocityJitter") : null;

            int lifeJitter = intRangeDefault(obj, "lifeJitter", 0, path, 0, 100);

            double[] size = segment(requirePresent(obj, "size", path), path + ".size");
            if (size[0] < 0 || size[1] < 0) throw error(path + ".size", "must be non-negative");
            ParticleDefinition.ChangeMode sizeMode =
                enumDefault(obj, "sizeMode", path, CHANGE_MODES, ParticleDefinition.ChangeMode.LINEAR);

            ColorGradient colorRamp = present(obj, "color") ? colorGradient(obj.get("color"), path + ".color") : ColorGradient.of(0xFFFFFF);
            int color = colorRamp.rgb(0);
            double[] alpha = present(obj, "alpha")
                ? segment(obj.get("alpha"), path + ".alpha") : new double[] {1, 1};
            checkAlpha(alpha[0], path + ".alpha");
            checkAlpha(alpha[1], path + ".alpha");
            ParticleDefinition.ChangeMode alphaMode =
                enumDefault(obj, "alphaMode", path, CHANGE_MODES, ParticleDefinition.ChangeMode.LINEAR);

            Value roll = present(obj, "roll") ? external(() -> Values.read(obj.get("roll"), path + ".roll")) : null;
            double spin = finiteDefault(obj, "spin", 0, path);
            double gravity = finiteDefault(obj, "gravity", 0, path);
            double drag = finiteDefault(obj, "drag", 1, path);
            if (drag < 0 || drag > 1) throw error(path + ".drag", "must be in 0..1, got " + drag);

            Vector2f deflection = present(obj, "deflection")
                ? vector2(obj.get("deflection"), path + ".deflection") : null;
            ParticleDefinition.VelocityExprSpec velocityExpr = present(obj, "velocity")
                ? velocity(obj.get("velocity"), path + ".velocity") : null;
            ParticleDefinition.CollisionSpec collision = present(obj, "collision")
                ? collision(obj.get("collision"), path + ".collision", drag, gravity) : null;
            ParticleDefinition.InteractSpec interact = present(obj, "interact")
                ? interact(obj.get("interact"), path + ".interact") : null;

            ParticleDefinition.RenderMode render =
                enumDefault(obj, "render", path, RENDER_MODES, ParticleDefinition.RenderMode.INSTANCED);
            ParticleDefinition.LightSpec light = present(obj, "light")
                ? light(obj.get("light"), path + ".light") : ParticleDefinition.LightSpec.world();
            boolean alwaysRender = boolDefault(obj, "alwaysRender", false, path);
            double bloom = finiteDefault(obj, "bloom", 0, path);
            boolean preCalculate = boolDefault(obj, "preCalculate", false, path);
            boolean reverse = boolDefault(obj, "reverse", false, path);
            ParticleDefinition.ChildParticleSpec emitterChild = present(obj, "child")
                ? childParticle(obj.get("child"), path + ".child") : null;

            int maxParticles = intDefault(obj, "maxParticles", 0, path, 0);

            return new ParticleDefinition.EmitterSpec(name, particle, spriteFrom, bind, offset, height, fit, orient,
                trailMinDistance, start, stop, rate, burst, shape, speed, spread, direction, fixedDirection,
                amount, positionJitter, velocityJitter, lifetime, lifeJitter, size[0], size[1], sizeMode, color,
                alpha[0], alpha[1], alphaMode, roll, spin, gravity, drag, deflection, velocityExpr, collision,
                interact, render, light, alwaysRender, bloom, preCalculate, reverse, emitterChild, maxParticles,
                colorRamp);
        }

        private ParticleDefinition.ChildParticleSpec childParticle(JsonElement element, String path) {
            JsonObject obj = requireObject(element, path);
            requireOnly(obj, CHILD_PARTICLE_KEYS, path);

            String particle = null;
            if (present(obj, "particle")) {
                particle = requireString(obj, "particle", path);
                if (!ID_PATTERN.matcher(particle).matches())
                    throw error(path + ".particle",
                        "expected namespace:path matching [a-z0-9_.-]+:[a-z0-9_./-]+, got '" + particle + "'");
            }
            ParticleDefinition.SpriteFrom spriteFrom =
                enumDefault(obj, "spriteFrom", path, SPRITE_SOURCES, null);
            Integer lifetime = present(obj, "lifetime")
                ? intValue(obj.get("lifetime"), path + ".lifetime", 1) : null;
            Integer lifeJitter = present(obj, "lifeJitter")
                ? intRangeDefault(obj, "lifeJitter", 0, path, 0, 100) : null;

            double[] size = optionalSegment(obj, "size", path);
            if (size != null && (size[0] < 0 || size[1] < 0)) throw error(path + ".size", "must be non-negative");
            ParticleDefinition.ChangeMode sizeMode = enumDefault(obj, "sizeMode", path, CHANGE_MODES, null);
            ColorGradient childColorRamp = present(obj, "color") ? colorGradient(obj.get("color"), path + ".color") : null;
            Integer color = childColorRamp == null ? null : childColorRamp.rgb(0);
            double[] alpha = optionalSegment(obj, "alpha", path);
            if (alpha != null) {
                checkAlpha(alpha[0], path + ".alpha");
                checkAlpha(alpha[1], path + ".alpha");
            }
            ParticleDefinition.ChangeMode alphaMode = enumDefault(obj, "alphaMode", path, CHANGE_MODES, null);
            Double spin = optionalFinite(obj, "spin", path);
            Double gravity = optionalFinite(obj, "gravity", path);
            Double drag = optionalUnit(obj, "drag", path);
            Vector2f deflection = present(obj, "deflection")
                ? vector2(obj.get("deflection"), path + ".deflection") : null;
            ParticleDefinition.VelocityExprSpec velocityExpr = present(obj, "velocity")
                ? velocity(obj.get("velocity"), path + ".velocity") : null;
            ParticleDefinition.CollisionSpec collision = present(obj, "collision")
                ? collision(obj.get("collision"), path + ".collision", drag == null ? 1 : drag, gravity == null ? 0 : gravity)
                : null;
            ParticleDefinition.RenderMode render = enumDefault(obj, "render", path, RENDER_MODES, null);
            ParticleDefinition.LightSpec light = present(obj, "light") ? light(obj.get("light"), path + ".light") : null;
            Double bloom = optionalFinite(obj, "bloom", path);
            Integer amount = present(obj, "amount") ? intValue(obj.get("amount"), path + ".amount", 1) : null;
            Vector3f positionJitter = present(obj, "positionJitter")
                ? vector(obj.get("positionJitter"), path + ".positionJitter") : null;
            Vector3f velocityJitter = present(obj, "velocityJitter")
                ? vector(obj.get("velocityJitter"), path + ".velocityJitter") : null;
            ParticleDefinition.ChildParticleSpec nested = present(obj, "child")
                ? childParticle(obj.get("child"), path + ".child") : null;

            return new ParticleDefinition.ChildParticleSpec(particle, spriteFrom, lifetime, lifeJitter,
                size == null ? null : size[0], size == null ? null : size[1], sizeMode, color,
                alpha == null ? null : alpha[0], alpha == null ? null : alpha[1], alphaMode, spin, gravity, drag,
                deflection, velocityExpr, collision, render, light, bloom, amount, positionJitter, velocityJitter,
                nested, childColorRamp);
        }

        private ParticleDefinition.ChildSpec child(
            JsonElement element, String path, int momentStop, Set<String> emitterNames) {
            JsonObject obj = requireObject(element, path);
            requireOnly(obj, CHILD_KEYS, path);
            ParticleDefinition.ChildTrigger on = enumValue(requirePresent(obj, "on", path), path + ".on", CHILD_TRIGGERS);
            String of = null;
            if (present(obj, "of")) {
                of = requireString(obj, "of", path);
                if (!emitterNames.contains(of)) throw error(path + ".of", "unknown emitter '" + of + "'");
            }
            String event = null;
            if (on == ParticleDefinition.ChildTrigger.EVENT) {
                if (!present(obj, "event")) throw error(path + ".event", "required when on is 'event'");
                event = requireString(obj, "event", path);
                if (event.isBlank()) throw error(path + ".event", "must not be blank");
            } else if (present(obj, "event")) {
                throw error(path + ".event", "only valid when on is 'event'");
            }
            JsonArray emitJson = requireArray(obj, "emit", path);
            if (emitJson.isEmpty()) throw error(path + ".emit", "requires at least one emitter");
            Set<String> names = new LinkedHashSet<>();
            List<ParticleDefinition.EmitterSpec> emit = new ArrayList<>(emitJson.size());
            for (int i = 0; i < emitJson.size(); i++) {
                String emitterPath = path + ".emit[" + i + "]";
                emit.add(emitter(requireObject(emitJson.get(i), emitterPath), emitterPath, momentStop, true, names));
            }
            return new ParticleDefinition.ChildSpec(on, of, event, emit);
        }

        private ParticleDefinition.BurstSpec burst(JsonElement element, String path) {
            JsonObject obj = requireObject(element, path);
            requireOnly(obj, BURST_KEYS, path);
            int count = intValue(requirePresent(obj, "count", path), path + ".count", 0);
            int interval = intDefault(obj, "interval", 1, path, 1);
            int repeats = intDefault(obj, "repeats", 1, path, 1);
            int at = intDefault(obj, "at", 0, path, 0);
            return new ParticleDefinition.BurstSpec(count, interval, repeats, at);
        }

        private ParticleDefinition.VelocityExprSpec velocity(JsonElement element, String path) {
            JsonObject obj = requireObject(element, path);
            requireOnly(obj, VELOCITY_KEYS, path);
            String x = present(obj, "x") ? expression(obj.get("x"), path + ".x") : null;
            String y = present(obj, "y") ? expression(obj.get("y"), path + ".y") : null;
            String z = present(obj, "z") ? expression(obj.get("z"), path + ".z") : null;
            if (x == null && y == null && z == null)
                throw error(path, "requires at least one of x, y, z");
            return new ParticleDefinition.VelocityExprSpec(x, y, z);
        }

        private ParticleDefinition.CollisionSpec collision(JsonElement element, String path, double drag, double gravity) {
            JsonObject obj = requireObject(element, path);
            requireOnly(obj, COLLISION_KEYS, path);
            int bounces = intDefault(obj, "bounces", 1, path, 0);
            double horizontalSpread = finiteDefault(obj, "horizontalSpread", 1, path);
            if (horizontalSpread < 0) throw error(path + ".horizontalSpread", "must be non-negative, got " + horizontalSpread);
            double verticalBounce = fractionDefault(obj, "verticalBounce", 1, path);
            double dragAfter = fractionDefault(obj, "dragAfter", drag, path);
            double gravityAfter = finiteDefault(obj, "gravityAfter", gravity, path);
            Vector2f deflectionAfter = present(obj, "deflectionAfter")
                ? vector2(obj.get("deflectionAfter"), path + ".deflectionAfter") : null;
            int disappearAt = intDefault(obj, "disappearAt", 0, path, 0);
            return new ParticleDefinition.CollisionSpec(bounces, horizontalSpread, verticalBounce, dragAfter,
                gravityAfter, deflectionAfter, disappearAt);
        }

        private ParticleDefinition.InteractSpec interact(JsonElement element, String path) {
            JsonObject obj = requireObject(element, path);
            requireOnly(obj, INTERACT_KEYS, path);
            return new ParticleDefinition.InteractSpec(requireFinite(obj, "horizontal", path), requireFinite(obj, "vertical", path));
        }

        private ParticleDefinition.LightSpec light(JsonElement element, String path) {
            if (element == null || !element.isJsonPrimitive() || !element.getAsJsonPrimitive().isString())
                throw error(path, "expected \"world\", \"full\" or an expression string");
            String text = element.getAsString();
            if (text.equals("world")) return ParticleDefinition.LightSpec.world();
            if (text.equals("full")) return ParticleDefinition.LightSpec.full();
            return ParticleDefinition.LightSpec.expression(expression(element, path));
        }

        // --- generic field access and validation -------------------------------------------------

        private void requireOnly(JsonObject obj, Set<String> allowed, String path) {
            for (String key : obj.keySet()) {
                if (!allowed.contains(key)) throw error(join(path, key), "unknown field");
            }
        }

        private boolean present(JsonObject owner, String key) {
            return owner.has(key) && !owner.get(key).isJsonNull();
        }

        private JsonElement requirePresent(JsonObject owner, String key, String path) {
            JsonElement element = owner.get(key);
            if (element == null || element.isJsonNull()) throw error(join(path, key), "required");
            return element;
        }

        private JsonObject requireObject(JsonElement element, String path) {
            if (element == null || !element.isJsonObject()) throw error(path, "expected object");
            return element.getAsJsonObject();
        }

        private JsonArray requireArray(JsonObject owner, String key, String path) {
            JsonElement element = requirePresent(owner, key, path);
            if (!element.isJsonArray()) throw error(join(path, key), "expected array");
            return element.getAsJsonArray();
        }

        private String requireString(JsonObject owner, String key, String path) {
            JsonElement element = requirePresent(owner, key, path);
            if (!element.isJsonPrimitive() || !element.getAsJsonPrimitive().isString())
                throw error(join(path, key), "expected string");
            return element.getAsString();
        }

        private double requireFinite(JsonObject owner, String key, String path) {
            return finite(requirePresent(owner, key, path), join(path, key));
        }

        private double finite(JsonElement element, String path) {
            if (element == null || !element.isJsonPrimitive() || !element.getAsJsonPrimitive().isNumber())
                throw error(path, "expected a finite number");
            double value = element.getAsDouble();
            if (!Double.isFinite(value)) throw error(path, "expected a finite number");
            return value;
        }

        private double finiteDefault(JsonObject owner, String key, double fallback, String path) {
            return present(owner, key) ? finite(owner.get(key), join(path, key)) : fallback;
        }

        private Double optionalFinite(JsonObject owner, String key, String path) {
            return present(owner, key) ? finite(owner.get(key), join(path, key)) : null;
        }

        private double fractionDefault(JsonObject owner, String key, double fallback, String path) {
            double value = finiteDefault(owner, key, fallback, path);
            if (value < 0 || value > 1) throw error(join(path, key), "must be in 0..1, got " + value);
            return value;
        }

        private Double optionalUnit(JsonObject owner, String key, String path) {
            if (!present(owner, key)) return null;
            double value = finite(owner.get(key), join(path, key));
            if (value < 0 || value > 1) throw error(join(path, key), "must be in 0..1, got " + value);
            return value;
        }

        private int intDefault(JsonObject owner, String key, int fallback, String path, int min) {
            return present(owner, key) ? intValue(owner.get(key), join(path, key), min) : fallback;
        }

        private int intRangeDefault(JsonObject owner, String key, int fallback, String path, int min, int max) {
            int value = intDefault(owner, key, fallback, path, min);
            if (value > max) throw error(join(path, key), "must be at most " + max + ", got " + value);
            return value;
        }

        private int intValue(JsonElement element, String path, int min) {
            return integer(element, path, min, boundPaths.contains(path));
        }

        /** Packed values (colours) never round a script-provided real; they must be exact integers. */
        private int intExact(JsonElement element, String path, int min) {
            return integer(element, path, min, false);
        }

        private int integer(JsonElement element, String path, int min, boolean roundBound) {
            if (element == null || !element.isJsonPrimitive() || !element.getAsJsonPrimitive().isNumber())
                throw error(path, "expected an integer");
            double value = element.getAsDouble();
            if (!Double.isFinite(value)) throw error(path, "expected an integer");
            if (value < min) throw error(path, "must be at least " + min + ", got " + value);
            if (value > Integer.MAX_VALUE) throw error(path, "is too large");
            if (value != Math.rint(value)) {
                if (!roundBound) throw error(path, "expected an integer");
                value = Math.round(value);
            }
            return (int) value;
        }

        private boolean boolDefault(JsonObject owner, String key, boolean fallback, String path) {
            if (!present(owner, key)) return fallback;
            JsonElement element = owner.get(key);
            if (!element.isJsonPrimitive() || !element.getAsJsonPrimitive().isBoolean())
                throw error(join(path, key), "expected a boolean");
            return element.getAsBoolean();
        }

        /** Parses {@code number} or {@code [begin, end]} into a two-element array. */
        private double[] segment(JsonElement element, String path) {
            if (element != null && element.isJsonArray()) {
                JsonArray array = element.getAsJsonArray();
                if (array.size() != 2) throw error(path, "expected [begin, end]");
                return new double[] {finite(array.get(0), path + "[0]"), finite(array.get(1), path + "[1]")};
            }
            double value = finite(element, path);
            return new double[] {value, value};
        }

        private double[] optionalSegment(JsonObject owner, String key, String path) {
            return present(owner, key) ? segment(owner.get(key), join(path, key)) : null;
        }

        private void checkAlpha(double value, String path) {
            if (!(value >= 0 && value <= 1)) throw error(path, "must be in 0..1, got " + value);
        }

        /**
         * Parses a colour as a fixed {@code 0xRRGGBB}/hex value or a {@code {gradient: [[t, colour], ...]}}
         * ramp. Payload bindings are already materialized into a number before this runs.
         */
        private ColorGradient colorGradient(JsonElement element, String path) {
            if (element != null && element.isJsonObject()) {
                try {
                    return ColorGradient.read(element, path);
                } catch (IllegalArgumentException failure) {
                    throw error(path, failure.getMessage());
                }
            }
            return ColorGradient.of(color(element, path));
        }

        private int color(JsonElement element, String path) {
            if (element != null && element.isJsonPrimitive()) {
                JsonPrimitive primitive = element.getAsJsonPrimitive();
                if (primitive.isNumber()) {
                    int value = intExact(element, path, 0);
                    if (value < 0 || value > 0xFFFFFF)
                        throw error(path, "colour must be within 0x000000..0xFFFFFF, got " + value);
                    return (int) value;
                }
                if (primitive.isString()) {
                    String text = primitive.getAsString().trim();
                    if (text.startsWith("#")) text = text.substring(1);
                    if (text.length() != 6) throw error(path, "expected 6 hex digits, got '" + primitive.getAsString() + "'");
                    try {
                        return Integer.parseInt(text, 16) & 0xFFFFFF;
                    } catch (NumberFormatException failure) {
                        throw error(path, "expected 6 hex digits, got '" + primitive.getAsString() + "'");
                    }
                }
            }
            throw error(path, "expected a 0xRRGGBB number or \"#RRGGBB\"");
        }

        private String expression(JsonElement element, String path) {
            if (element == null || !element.isJsonPrimitive() || !element.getAsJsonPrimitive().isString())
                throw error(path, "expected an expression string");
            String text = element.getAsString();
            if (text.isBlank()) throw error(path, "expression must not be blank");
            if (text.length() > MAX_EXPRESSION)
                throw error(path, "expression must be at most " + MAX_EXPRESSION + " characters, got " + text.length());
            return text;
        }

        private Vector3f vector(JsonElement element, String path) {
            if (element == null || !element.isJsonArray() || element.getAsJsonArray().size() != 3)
                throw error(path, "expected [x, y, z]");
            JsonArray array = element.getAsJsonArray();
            return new Vector3f(
                (float) finite(array.get(0), path + "[0]"),
                (float) finite(array.get(1), path + "[1]"),
                (float) finite(array.get(2), path + "[2]"));
        }

        private Vector2f vector2(JsonElement element, String path) {
            if (element == null || !element.isJsonArray() || element.getAsJsonArray().size() != 2)
                throw error(path, "expected [x, z]");
            JsonArray array = element.getAsJsonArray();
            return new Vector2f(
                (float) finite(array.get(0), path + "[0]"),
                (float) finite(array.get(1), path + "[1]"));
        }

        private <E extends Enum<E>> E enumDefault(
            JsonObject owner, String key, String path, Map<String, E> values, E fallback) {
            return present(owner, key) ? enumValue(owner.get(key), join(path, key), values) : fallback;
        }

        private <E extends Enum<E>> E enumValue(JsonElement element, String path, Map<String, E> values) {
            if (element == null || !element.isJsonPrimitive() || !element.getAsJsonPrimitive().isString())
                throw error(path, "expected one of " + values.keySet());
            String text = element.getAsString();
            E value = values.get(text);
            if (value == null) throw error(path, "unknown value '" + text + "', expected one of " + values.keySet());
            return value;
        }

        /** Runs a sub-parser that already names the full JSON path, adding only the definition header. */
        private <T> T external(Supplier<T> call) {
            try {
                return call.get();
            } catch (IllegalArgumentException error) {
                throw new IllegalArgumentException(header + " " + error.getMessage(), error);
            }
        }

        private IllegalArgumentException error(String path, String reason) {
            String where = path.isEmpty() ? "" : " " + path;
            return new IllegalArgumentException(header + where + ": " + reason);
        }
    }

    private static String join(String path, String key) {
        return path.isEmpty() ? key : path + "." + key;
    }
}
