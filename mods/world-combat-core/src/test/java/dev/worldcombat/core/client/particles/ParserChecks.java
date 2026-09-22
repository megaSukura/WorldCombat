package dev.worldcombat.core.client.particles;

import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import java.util.Objects;
import org.joml.Vector2f;
import org.joml.Vector3f;

/**
 * Pure-logic checks for the v2 {@link DefinitionParser}: a full definition round-trips into the
 * model with every default resolved, nested child particles parse, and strict validation reports the
 * JSON path for bad input. Owned by the model/parser module.
 */
public final class ParserChecks {
    private ParserChecks() {}

    private static final String ID = "world_combat:test";
    private static final int VERSION = 3;
    private static final String HEADER = ID + "@" + VERSION + " ";
    private static final String BASE =
        "{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1}";

    private static final String FULL = """
        {
          "moments": {
            "charge": {
              "duration": 40,
              "exit": { "stop": 18, "drain": 8 },
              "emitters": [
                {
                  "name": "orb",
                  "particle": "cobblemon:particle/orb/energyorb",
                  "spriteFrom": "age",
                  "bind": "source",
                  "offset": [0.0, 1.0, 0.0],
                  "height": 0.75,
                  "start": 2,
                  "stop": 10,
                  "rate": [[0, 3], [1, 0]],
                  "burst": { "count": 2, "interval": 1, "repeats": 3, "at": 0 },
                  "shape": { "kind": "sphere", "radius": 0.6, "thickness": 0.5 },
                  "speed": [0.0, 0.2],
                  "spread": 30,
                  "direction": "outward",
                  "amount": 4,
                  "positionJitter": [0.1, 0.2, 0.3],
                  "velocityJitter": [0.01, 0.02, 0.03],
                  "lifetime": { "curve": [[0, 20], [1, 40]] },
                  "lifeJitter": 15,
                  "size": [0.1, 0.5],
                  "sizeMode": "sin",
                  "color": 6737151,
                  "alpha": [0, 1],
                  "alphaMode": "index",
                  "roll": 45,
                  "spin": 90,
                  "gravity": 0.04,
                  "drag": 0.9,
                  "deflection": [0.01, -0.02],
                  "velocity": { "x": "0.1*t", "y": "0.2", "z": "-0.1*t" },
                  "collision": { "bounces": 2, "horizontalSpread": 0.5, "verticalBounce": 0.6, "dragAfter": 0.7, "gravityAfter": 0.02, "deflectionAfter": [0.1, 0.2], "disappearAt": 2 },
                  "interact": { "horizontal": 0.5, "vertical": 0.25 },
                  "render": "lit",
                  "light": "15*t",
                  "alwaysRender": true,
                  "bloom": 0.5,
                  "preCalculate": true,
                  "reverse": true,
                  "child": {
                    "particle": "cobblemon:particle/orb/orb",
                    "spriteFrom": "random",
                    "lifetime": 12,
                    "lifeJitter": 10,
                    "size": [0.2, 0.4],
                    "sizeMode": "linear",
                    "color": 16711680,
                    "alpha": [1, 0],
                    "alphaMode": "sin",
                    "spin": 30,
                    "gravity": 0.01,
                    "drag": 0.8,
                    "deflection": [0.02, 0.03],
                    "velocity": { "y": "0.05" },
                    "collision": { "bounces": 1 },
                    "render": "translucent",
                    "light": "full",
                    "bloom": 0.2,
                    "amount": 2,
                    "positionJitter": [0.05, 0.05, 0.05],
                    "velocityJitter": [0.01, 0.01, 0.01],
                    "child": {
                      "particle": "cobblemon:particle/sparkle/sparkle",
                      "lifetime": 5,
                      "child": { "particle": "minecraft:flame", "lifetime": 3 }
                    }
                  },
                  "maxParticles": 500
                },
                {
                  "name": "trail",
                  "particle": "cobblemon:particle/electricity/electric_spark",
                  "bind": "projectile",
                  "trail": { "minDistance": 0.3 },
                  "rate": 6,
                  "lifetime": 20,
                  "size": 0.2
                }
              ],
              "children": [
                { "on": "birth", "of": "orb", "emit": [
                  { "name": "spark", "particle": "cobblemon:particle/sparkle/sparkle", "lifetime": 10, "size": 0.1, "rate": 1 }
                ] },
                { "on": "event", "event": "flash", "emit": [
                  { "name": "flash", "particle": "cobblemon:particle/star", "lifetime": 5, "size": 0.3, "burst": { "count": 1 } }
                ] }
              ]
            },
            "flight": {
              "emitters": [
                {
                  "name": "head",
                  "particle": "cobblemon:particle/orb/orb",
                  "direction": [0, 1, 0],
                  "burst": { "count": 2, "interval": 1, "repeats": 1, "at": 0 },
                  "lifetime": 30,
                  "size": 0.4
                }
              ]
            }
          },
          "interrupt": "hide"
        }
        """;

    public static void main(String[] args) {
        complete();
        childParticles();
        defaults();
        illegal();
        System.out.println("ParserChecks PASS");
    }

    private static void complete() {
        ParticleDefinition definition = DefinitionParser.parse("world_combat:thunderbolt", 1, json(FULL));
        num(definition.moments().size(), 2, "moment count");
        same(definition.interrupt(), ParticleDefinition.ExitMode.HIDE, "interrupt");

        ParticleDefinition.Moment charge = definition.moment("charge");
        is(charge != null, "charge moment present");
        num(charge.duration(), 40, "charge duration");
        num(charge.stop(), 18, "charge stop");
        num(charge.drain(), 8, "charge drain");
        num(charge.emitters().size(), 2, "charge emitter count");
        num(charge.children().size(), 2, "charge child count");

        ParticleDefinition.EmitterSpec orb = charge.emitters().get(0);
        same(orb.name(), "orb", "orb name");
        same(orb.particle(), "cobblemon:particle/orb/energyorb", "orb particle");
        same(orb.spriteFrom(), ParticleDefinition.SpriteFrom.AGE, "orb spriteFrom");
        same(orb.bind(), ParticleDefinition.Bind.SOURCE, "orb bind");
        vec3(orb.offset(), 0, 1, 0, "orb offset");
        num(orb.height(), 0.75, "orb height");
        num(orb.start(), 2, "orb start");
        num(orb.stop(), 10, "orb stop");
        num(orb.rate().sample(0, 0), 3, "orb rate bare curve start");
        num(orb.rate().sample(0.5, 0), 1.5, "orb rate bare curve midpoint");
        num(orb.rate().sample(1, 0), 0, "orb rate bare curve end");
        num(orb.burst().count(), 2, "orb burst count");
        num(orb.burst().interval(), 1, "orb burst interval");
        num(orb.burst().repeats(), 3, "orb burst repeats");
        num(orb.burst().at(), 0, "orb burst at");
        is(orb.shape() != null, "orb shape present");
        num(orb.speed().sample(0, 0), 0, "orb speed min");
        num(orb.speed().sample(0, 1), 0.2, "orb speed max");
        num(orb.spread().sample(0, 0), 30, "orb spread");
        same(orb.direction(), ParticleDefinition.Direction.OUTWARD, "orb direction");
        is(orb.fixedDirection() == null, "orb has no fixed direction");
        num(orb.amount(), 4, "orb amount");
        vec3(orb.positionJitter(), 0.1f, 0.2f, 0.3f, "orb position jitter");
        vec3(orb.velocityJitter(), 0.01f, 0.02f, 0.03f, "orb velocity jitter");
        num(orb.lifetime().sample(0, 0), 20, "orb lifetime start");
        num(orb.lifetime().sample(1, 0), 40, "orb lifetime end");
        num(orb.lifeJitter(), 15, "orb life jitter");
        num(orb.sizeBegin(), 0.1, "orb size begin");
        num(orb.sizeEnd(), 0.5, "orb size end");
        same(orb.sizeMode(), ParticleDefinition.ChangeMode.SIN, "orb size mode");
        num(orb.color(), 0x66CCFF, "orb color");
        num(orb.alphaBegin(), 0, "orb alpha begin");
        num(orb.alphaEnd(), 1, "orb alpha end");
        same(orb.alphaMode(), ParticleDefinition.ChangeMode.INDEX, "orb alpha mode");
        num(orb.roll().sample(0, 0), 45, "orb roll");
        num(orb.spin(), 90, "orb spin");
        num(orb.gravity(), 0.04, "orb gravity");
        num(orb.drag(), 0.9, "orb drag");
        vec2(orb.deflection(), 0.01f, -0.02f, "orb deflection");
        same(orb.velocityExpr().x(), "0.1*t", "orb velocity x");
        same(orb.velocityExpr().y(), "0.2", "orb velocity y");
        same(orb.velocityExpr().z(), "-0.1*t", "orb velocity z");
        num(orb.collision().bounces(), 2, "orb collision bounces");
        num(orb.collision().horizontalSpread(), 0.5, "orb collision horizontal spread");
        num(orb.collision().verticalBounce(), 0.6, "orb collision vertical bounce");
        num(orb.collision().dragAfter(), 0.7, "orb collision drag after");
        num(orb.collision().gravityAfter(), 0.02, "orb collision gravity after");
        vec2(orb.collision().deflectionAfter(), 0.1f, 0.2f, "orb collision deflection after");
        num(orb.collision().disappearAt(), 2, "orb collision disappear at");
        num(orb.interact().horizontal(), 0.5, "orb interact horizontal");
        num(orb.interact().vertical(), 0.25, "orb interact vertical");
        same(orb.render(), ParticleDefinition.RenderMode.LIT, "orb render");
        same(orb.light().kind(), ParticleDefinition.LightKind.EXPR, "orb light kind");
        same(orb.light().expr(), "15*t", "orb light expression");
        is(orb.alwaysRender(), "orb always render");
        num(orb.bloom(), 0.5, "orb bloom");
        is(orb.preCalculate(), "orb pre calculate");
        is(orb.reverse(), "orb reverse");
        num(orb.maxParticles(), 500, "orb max particles");
        is(!orb.trails(), "orb does not trail");
        is(orb.continuous(), "orb has a rate");

        ParticleDefinition.EmitterSpec trail = charge.emitters().get(1);
        same(trail.name(), "trail", "trail name");
        same(trail.bind(), ParticleDefinition.Bind.PROJECTILE, "trail bind");
        is(trail.trails(), "trail should trail");
        num(trail.trailMinDistance(), 0.3, "trail min distance");
        is(trail.burst() == null, "trail has no burst");
        is(trail.continuous(), "trail has a rate");
        num(trail.stop(), 18, "trail stop defaults to the moment stop");

        ParticleDefinition.ChildSpec birth = charge.children().get(0);
        same(birth.on(), ParticleDefinition.ChildTrigger.BIRTH, "birth trigger");
        same(birth.of(), "orb", "birth of");
        is(birth.event() == null, "birth has no event");
        num(birth.emit().size(), 1, "birth emit count");
        same(birth.emit().get(0).bind(), ParticleDefinition.Bind.POINT, "child emit bind is point");
        ParticleDefinition.ChildSpec event = charge.children().get(1);
        same(event.on(), ParticleDefinition.ChildTrigger.EVENT, "event trigger");
        same(event.event(), "flash", "event name");
        is(event.of() == null, "event watches all emitters");

        ParticleDefinition.Moment flight = definition.moment("flight");
        is(flight.indefinite(), "flight is indefinite");
        num(flight.duration(), 0, "flight duration");
        num(flight.stop(), 0, "flight stop");
        num(flight.drain(), 40, "flight drain");
        ParticleDefinition.EmitterSpec head = flight.emitters().get(0);
        num(head.stop(), 0, "head stop defaults to 0 for an indefinite moment");
        same(head.bind(), ParticleDefinition.Bind.SOURCE, "head bind default");
        num(head.height(), 0.5, "head height default");
        num(head.start(), 0, "head start default");
        same(head.spriteFrom(), ParticleDefinition.SpriteFrom.AGE, "head spriteFrom default");
        same(head.direction(), ParticleDefinition.Direction.FIXED, "head fixed direction");
        vec3(head.fixedDirection(), 0, 1, 0, "head fixed direction vector");
        num(head.amount(), 1, "head amount default");
        num(head.lifeJitter(), 0, "head life jitter default");
        same(head.sizeMode(), ParticleDefinition.ChangeMode.LINEAR, "head size mode default");
        num(head.alphaBegin(), 1, "head alpha begin default");
        num(head.alphaEnd(), 1, "head alpha end default");
        same(head.alphaMode(), ParticleDefinition.ChangeMode.LINEAR, "head alpha mode default");
        num(head.spin(), 0, "head spin default");
        num(head.gravity(), 0, "head gravity default");
        num(head.drag(), 1, "head drag default");
        same(head.render(), ParticleDefinition.RenderMode.INSTANCED, "head render default");
        same(head.light().kind(), ParticleDefinition.LightKind.WORLD, "head light default");
        num(head.maxParticles(), 0, "head max particles default");
        is(head.roll() == null, "head roll default null");
        is(head.deflection() == null, "head deflection default null");
        is(head.velocityExpr() == null, "head velocity default null");
        is(head.collision() == null, "head collision default null");
        is(head.interact() == null, "head interact default null");
        is(head.positionJitter() == null, "head position jitter default null");
        is(head.velocityJitter() == null, "head velocity jitter default null");
        is(head.child() == null, "head child default null");
        num(head.color(), 0xFFFFFF, "head colour default white");
        Shape.Spawn spawn = head.shape().sample(new ParticleRandom(1), 0, 0);
        is(spawn.position().lengthSquared() == 0, "head shape default point");
    }

    private static void childParticles() {
        ParticleDefinition definition = DefinitionParser.parse("world_combat:test", 1, json(FULL));
        ParticleDefinition.ChildParticleSpec child =
            definition.moment("charge").emitters().get(0).child();
        is(child != null, "orb has a child particle");
        same(child.particle(), "cobblemon:particle/orb/orb", "child particle");
        same(child.spriteFrom(), ParticleDefinition.SpriteFrom.RANDOM, "child spriteFrom");
        num(child.lifetime(), 12, "child lifetime");
        num(child.lifeJitter(), 10, "child life jitter");
        num(child.sizeBegin(), 0.2, "child size begin");
        num(child.sizeEnd(), 0.4, "child size end");
        same(child.sizeMode(), ParticleDefinition.ChangeMode.LINEAR, "child size mode");
        num(child.color(), 0xFF0000, "child color");
        num(child.alphaBegin(), 1, "child alpha begin");
        num(child.alphaEnd(), 0, "child alpha end");
        same(child.alphaMode(), ParticleDefinition.ChangeMode.SIN, "child alpha mode");
        num(child.spin(), 30, "child spin");
        num(child.gravity(), 0.01, "child gravity");
        num(child.drag(), 0.8, "child drag");
        vec2(child.deflection(), 0.02f, 0.03f, "child deflection");
        same(child.velocityExpr().y(), "0.05", "child velocity y");
        is(child.collision() != null, "child collision present");
        num(child.collision().bounces(), 1, "child collision bounces");
        num(child.collision().horizontalSpread(), 1, "child collision horizontal default");
        same(child.render(), ParticleDefinition.RenderMode.TRANSLUCENT, "child render");
        same(child.light().kind(), ParticleDefinition.LightKind.FULL, "child light");
        num(child.bloom(), 0.2, "child bloom");
        num(child.amount(), 2, "child amount");
        vec3(child.positionJitter(), 0.05f, 0.05f, 0.05f, "child position jitter");
        vec3(child.velocityJitter(), 0.01f, 0.01f, 0.01f, "child velocity jitter");

        ParticleDefinition.ChildParticleSpec grandchild = child.child();
        is(grandchild != null, "child has a grandchild");
        same(grandchild.particle(), "cobblemon:particle/sparkle/sparkle", "grandchild particle");
        ParticleDefinition.ChildParticleSpec greatGrandchild = grandchild.child();
        is(greatGrandchild != null, "grandchild has a child");
        same(greatGrandchild.particle(), "minecraft:flame", "great grandchild particle (3 levels legal)");
        num(greatGrandchild.lifetime(), 3, "great grandchild lifetime");

        ParticleDefinition.ChildParticleSpec empty = DefinitionParser.parse(ID, 1, json("""
            {"moments":{"main":{"emitters":[
              {"name":"a","particle":"ns:path","lifetime":10,"size":1,"rate":1,"child":{}}
            ]}}}
            """)).moment("main").emitters().get(0).child();
        is(empty.particle() == null && empty.lifetime() == null && empty.child() == null,
            "empty child particle inherits every field");
    }

    private static void defaults() {
        ParticleDefinition minimal = DefinitionParser.parse(ID, 1, json("""
            {"moments":{"main":{"emitters":[
              {"name":"spark","particle":"minecraft:flame","lifetime":10,"size":1,"rate":0}
            ]}}}
            """));
        ParticleDefinition.Moment main = minimal.moment("main");
        num(main.duration(), 0, "minimal duration");
        num(main.stop(), 0, "minimal stop");
        num(main.drain(), 40, "minimal drain");
        is(main.indefinite(), "minimal is indefinite");
        ParticleDefinition.EmitterSpec spark = main.emitters().get(0);
        num(spark.stop(), 0, "minimal emitter stop");
        is(spark.rate() != null && spark.rate().sample(0, 0.9) == 0, "rate 0 is allowed");
        same(minimal.interrupt(), ParticleDefinition.ExitMode.DRAIN, "interrupt default drain");

        ParticleDefinition explicit = DefinitionParser.parse(ID, 1, json("""
            {"moments":{"main":{"duration":40,"exit":{"stop":18},"emitters":[
              {"name":"spark","particle":"minecraft:flame","lifetime":10,"size":1,"burst":{"count":1}}
            ]}}}
            """));
        ParticleDefinition.Moment explicitMoment = explicit.moment("main");
        num(explicitMoment.stop(), 18, "explicit exit.stop smaller than duration is allowed");
        num(explicitMoment.drain(), 40, "drain defaults when exit omits it");
        num(explicitMoment.emitters().get(0).stop(), 18, "emitter stop inherits explicit exit.stop");

        ParticleDefinition.BurstSpec burst = DefinitionParser.parse(ID, 1, json("""
            {"moments":{"main":{"emitters":[
              {"name":"spark","particle":"minecraft:flame","lifetime":10,"size":1,"burst":{"count":5}}
            ]}}}
            """)).moment("main").emitters().get(0).burst();
        num(burst.interval(), 1, "burst interval default");
        num(burst.repeats(), 1, "burst repeats default");
        num(burst.at(), 0, "burst at default");

        ParticleDefinition fixed = DefinitionParser.parse(ID, 1, json("""
            {"moments":{"main":{"emitters":[
              {"name":"spark","particle":"minecraft:flame","lifetime":10,"size":1,"rate":1,"direction":[0,2,0]}
            ]}}}
            """));
        vec3(fixed.moment("main").emitters().get(0).fixedDirection(), 0, 1, 0, "fixed direction is normalized");

        ParticleDefinition colored = DefinitionParser.parse(ID, 1, json("""
            {"moments":{"main":{"emitters":[
              {"name":"spark","particle":"minecraft:flame","lifetime":10,"size":1,"rate":1,"color":"#336699"}
            ]}}}
            """));
        num(colored.moment("main").emitters().get(0).color(), 0x336699, "hex string colour accepted");

        ParticleDefinition light = DefinitionParser.parse(ID, 1, json("""
            {"moments":{"main":{"emitters":[
              {"name":"spark","particle":"minecraft:flame","lifetime":10,"size":1,"rate":1,"light":"full"}
            ]}}}
            """));
        same(light.moment("main").emitters().get(0).light().kind(), ParticleDefinition.LightKind.FULL,
            "full light keyword");
    }

    private static void illegal() {
        // top level and moments
        bad("{}", "moments");
        bad("{\"moments\":{}}", "moments");
        bad("{\"moments\":[]}", "moments");
        bad("{\"moments\":{\"main\":5}}", "moments.main");
        bad("{\"moments\":{\"Bad\":{\"emitters\":[" + BASE + "]}}}", "moments.Bad");
        bad("{\"moments\":{\"main\":{\"emitters\":[" + BASE + "]}},\"seed\":true}", "seed");
        bad("{\"moments\":{\"main\":{\"emitters\":[" + BASE + "]}},\"interrupt\":\"stop\"}", "interrupt");

        // moment fields
        badMoment("{\"emitters\":[" + BASE + "],\"foo\":1}", "moments.main.foo");
        badMoment("{\"duration\":5}", "moments.main.emitters");
        badMoment("{\"emitters\":[]}", "moments.main.emitters");
        badMoment("{\"duration\":-1,\"emitters\":[" + BASE + "]}", "moments.main.duration");
        badMoment("{\"exit\":{\"stop\":1,\"foo\":2},\"emitters\":[" + BASE + "]}", "moments.main.exit.foo");
        badMoment("{\"exit\":{\"stop\":-1},\"emitters\":[" + BASE + "]}", "moments.main.exit.stop");
        bad("{\"moments\":{\"main\":{\"emitters\":[" + BASE + "," + BASE + "]}}}", "moments.main.emitters[1].name");

        // emitter required fields
        badEmitter("{\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1}", "moments.main.emitters[0].name");
        badEmitter("{\"name\":\"a\",\"lifetime\":10,\"size\":1,\"rate\":1}", "moments.main.emitters[0].particle");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"size\":1,\"rate\":1}", "moments.main.emitters[0].lifetime");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"rate\":1}", "moments.main.emitters[0].size");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1}", "moments.main.emitters[0]");

        // removed v1 fields must be unknown
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"texture\":\"ns:path\"}", "moments.main.emitters[0].texture");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"frames\":{}}", "moments.main.emitters[0].frames");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"space\":\"local\"}", "moments.main.emitters[0].space");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"vortex\":{\"strength\":1}}", "moments.main.emitters[0].vortex");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"acceleration\":[0,1,0]}", "moments.main.emitters[0].acceleration");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"orbit\":{\"radius\":1,\"speed\":1}}", "moments.main.emitters[0].orbit");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"attract\":{\"strength\":1}}", "moments.main.emitters[0].attract");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"speedLimit\":1}", "moments.main.emitters[0].speedLimit");

        // particle id
        badEmitter("{\"name\":\"a\",\"particle\":\"NoNamespace\",\"lifetime\":10,\"size\":1,\"rate\":1}", "moments.main.emitters[0].particle");
        badEmitter("{\"name\":\"a\",\"particle\":\"NS:path\",\"lifetime\":10,\"size\":1,\"rate\":1}", "moments.main.emitters[0].particle");

        // rate and burst
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":true}", "moments.main.emitters[0].rate");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"burst\":{}}", "moments.main.emitters[0].burst.count");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"burst\":{\"count\":1,\"interval\":0}}", "moments.main.emitters[0].burst.interval");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"burst\":{\"count\":-1}}", "moments.main.emitters[0].burst.count");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":[1,2,3]}", "moments.main.emitters[0].rate");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":[[1,1],[0.5,1]]}", "moments.main.emitters[0].rate");

        // timing
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"start\":10,\"stop\":5}", "moments.main.emitters[0].start");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"stop\":-1}", "moments.main.emitters[0].stop");

        // size, alpha and modes
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":[0.1,0.2,0.3],\"rate\":1}", "moments.main.emitters[0].size");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":[],\"rate\":1}", "moments.main.emitters[0].size");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":[-1,0.5],\"rate\":1}", "moments.main.emitters[0].size");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"sizeMode\":\"step\",\"rate\":1}", "moments.main.emitters[0].sizeMode");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"alpha\":[0,1.5],\"rate\":1}", "moments.main.emitters[0].alpha");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"alphaMode\":\"ease\",\"rate\":1}", "moments.main.emitters[0].alphaMode");

        // numeric ranges and booleans
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"lifeJitter\":101}", "moments.main.emitters[0].lifeJitter");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"lifeJitter\":-1}", "moments.main.emitters[0].lifeJitter");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"drag\":1.5}", "moments.main.emitters[0].drag");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"amount\":0}", "moments.main.emitters[0].amount");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"amount\":1.5}", "moments.main.emitters[0].amount");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"maxParticles\":-1}", "moments.main.emitters[0].maxParticles");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"gravity\":\"high\"}", "moments.main.emitters[0].gravity");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"height\":\"tall\"}", "moments.main.emitters[0].height");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"color\":16777216}", "moments.main.emitters[0].color");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"color\":\"red\"}", "moments.main.emitters[0].color");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"alwaysRender\":\"yes\"}", "moments.main.emitters[0].alwaysRender");

        // direction, enums and vectors
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"direction\":[0,0,0]}", "moments.main.emitters[0].direction");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"direction\":\"sideways\"}", "moments.main.emitters[0].direction");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"bind\":\"actor\"}", "moments.main.emitters[0].bind");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"spriteFrom\":\"loop\"}", "moments.main.emitters[0].spriteFrom");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"render\":\"glow\"}", "moments.main.emitters[0].render");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"light\":true}", "moments.main.emitters[0].light");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"offset\":[0,1]}", "moments.main.emitters[0].offset");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"positionJitter\":[0,1]}", "moments.main.emitters[0].positionJitter");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"deflection\":[1]}", "moments.main.emitters[0].deflection");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"lifetime\":[]}", "moments.main.emitters[0].lifetime");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"roll\":[]}", "moments.main.emitters[0].roll");

        // velocity expressions
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"velocity\":{\"x\":\"\"}}", "moments.main.emitters[0].velocity.x");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"velocity\":{\"w\":\"t\"}}", "moments.main.emitters[0].velocity.w");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"velocity\":{}}", "moments.main.emitters[0].velocity");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"velocity\":true}", "moments.main.emitters[0].velocity");

        // collision and interact
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"collision\":{\"foo\":1}}", "moments.main.emitters[0].collision.foo");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"collision\":{\"bounces\":-1}}", "moments.main.emitters[0].collision.bounces");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"collision\":{\"verticalBounce\":2}}", "moments.main.emitters[0].collision.verticalBounce");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"collision\":{\"deflectionAfter\":[1]}}", "moments.main.emitters[0].collision.deflectionAfter");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"interact\":{\"horizontal\":1}}", "moments.main.emitters[0].interact.vertical");

        // trickle-down particle child
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"child\":{\"foo\":1}}", "moments.main.emitters[0].child.foo");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"child\":{\"particle\":\"NoNamespace\"}}", "moments.main.emitters[0].child.particle");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"child\":{\"size\":[0.1,0.2,0.3]}}", "moments.main.emitters[0].child.size");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"child\":{\"lifeJitter\":101}}", "moments.main.emitters[0].child.lifeJitter");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"child\":{\"amount\":0}}", "moments.main.emitters[0].child.amount");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"child\":{\"velocity\":{\"x\":\"\"}}}", "moments.main.emitters[0].child.velocity.x");

        // trail and child emitter groups
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"trail\":{\"minDistance\":0}}", "moments.main.emitters[0].trail.minDistance");
        badEmitter("{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"trail\":{\"minDistance\":0.3,\"foo\":1}}", "moments.main.emitters[0].trail.foo");
        bad("{\"moments\":{\"main\":{\"emitters\":[" + BASE + "],\"children\":5}}}", "moments.main.children");
        badChild("{\"emit\":[" + BASE + "]}", "moments.main.children[0].on");
        badChild("{\"on\":\"death\",\"emit\":[" + BASE + "]}", "moments.main.children[0].on");
        badChild("{\"on\":\"spawn\",\"emit\":[" + BASE + "]}", "moments.main.children[0].on");
        badChild("{\"on\":\"birth\",\"of\":\"ghost\",\"emit\":[" + BASE + "]}", "moments.main.children[0].of");
        badChild("{\"on\":\"event\",\"emit\":[" + BASE + "]}", "moments.main.children[0].event");
        badChild("{\"on\":\"birth\",\"event\":\"flash\",\"emit\":[" + BASE + "]}", "moments.main.children[0].event");
        badChild("{\"on\":\"birth\",\"emit\":[]}", "moments.main.children[0].emit");
        badChild("{\"on\":\"birth\",\"emit\":[" + BASE + "],\"foo\":1}", "moments.main.children[0].foo");
        badChild("{\"on\":\"birth\",\"emit\":[{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"trail\":{\"minDistance\":0.2}}]}", "moments.main.children[0].emit[0].trail");
        badChild("{\"on\":\"birth\",\"emit\":[{\"name\":\"a\",\"particle\":\"ns:path\",\"lifetime\":10,\"size\":1,\"rate\":1,\"foo\":1}]}", "moments.main.children[0].emit[0].foo");
    }

    private static void badMoment(String moment, String path) {
        bad("{\"moments\":{\"main\":" + moment + "}}", path);
    }

    private static void badEmitter(String emitter, String path) {
        bad("{\"moments\":{\"main\":{\"emitters\":[" + emitter + "]}}}", path);
    }

    private static void badChild(String child, String path) {
        bad("{\"moments\":{\"main\":{\"emitters\":[" + BASE + "],\"children\":[" + child + "]}}}", path);
    }

    private static void bad(String json, String path) {
        try {
            DefinitionParser.parse(ID, VERSION, JsonParser.parseString(json));
        } catch (IllegalArgumentException failure) {
            String message = failure.getMessage();
            if (message == null) throw new AssertionError("missing message for path " + path);
            if (!message.startsWith(HEADER)) throw new AssertionError("missing header for " + path + ": " + message);
            if (!message.contains(path)) throw new AssertionError("expected path '" + path + "' in: " + message);
            return;
        }
        throw new AssertionError("expected rejection at " + path + " for " + json);
    }

    private static JsonElement json(String text) {
        return JsonParser.parseString(text);
    }

    private static void num(double actual, double expected, String label) {
        if (Math.abs(actual - expected) > 1e-9) throw new AssertionError(label + ": expected " + expected + " got " + actual);
    }

    private static void same(Object actual, Object expected, String label) {
        if (!Objects.equals(actual, expected)) throw new AssertionError(label + ": expected " + expected + " got " + actual);
    }

    private static void is(boolean condition, String label) {
        if (!condition) throw new AssertionError(label);
    }

    private static void vec3(Vector3f actual, float x, float y, float z, String label) {
        if (actual == null) throw new AssertionError(label + ": null vector");
        if (Math.abs(actual.x - x) > 1e-5 || Math.abs(actual.y - y) > 1e-5 || Math.abs(actual.z - z) > 1e-5)
            throw new AssertionError(label + ": expected [" + x + ", " + y + ", " + z + "] got " + actual);
    }

    private static void vec2(Vector2f actual, float x, float z, String label) {
        if (actual == null) throw new AssertionError(label + ": null vector");
        if (Math.abs(actual.x - x) > 1e-5 || Math.abs(actual.y - z) > 1e-5)
            throw new AssertionError(label + ": expected [" + x + ", " + z + "] got " + actual);
    }
}
