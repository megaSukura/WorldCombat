package dev.worldcombat.core.checks;

import com.google.gson.JsonParser;
import dev.worldcombat.core.runtime.WorldEvent;
import dev.worldcombat.core.world.MinecraftCombat;
import dev.worldcombat.core.world.NativeMobEffectGate;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.neoforged.neoforge.event.entity.living.MobEffectEvent;
import java.util.UUID;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Neutral native application attempts: attribution, refusal, immunity and unchanged stacking. */
public final class NativeMobEffectChecks {
    private static UUID subject;
    private static Entity expectedSource;
    private static String expectedActor = "", expectedOrigin = "", mode = "";
    private static int events;

    public static void onIncoming(WorldEvent event) {
        if (subject == null || event.target() == null || !event.target().entity().equals(subject)) return;
        events++;
        var data = JsonParser.parseString(event.data()).getAsJsonObject();
        require(data.get("originInstance").getAsString().equals(expectedOrigin) && event.world().originInstance().equals(expectedOrigin),
            "Effect borrowed another application execution origin");
        require((event.world().originData("checks:effect-token") != null) == !expectedOrigin.isEmpty(), "Effect origin data escaped its execution");
        require(data.get("sourceActor").getAsString().equals(expectedActor), "Effect caller actor was invented or lost");
        require(event.actor().ref().equals(expectedActor.isEmpty() ? event.target().ref() : expectedActor), "Effect event actor fallback is inconsistent");
        require(data.get("sourceEntity").getAsString().equals(expectedSource == null ? "" : expectedSource.getStringUUID()), "Effect lost exact native caller UUID");
        if (expectedSource == null) {
            require(data.get("sourcePosition").isJsonNull() && data.get("sourceType").getAsString().isEmpty()
                && !data.get("sourceLiving").getAsBoolean(), "Unknown effect caller has fabricated facts");
        } else {
            var position = data.getAsJsonArray("sourcePosition");
            require(position.get(0).getAsDouble() == expectedSource.getX() && position.get(1).getAsDouble() == expectedSource.getY()
                && position.get(2).getAsDouble() == expectedSource.getZ(), "Effect caller position changed");
            require(data.get("sourceLiving").getAsBoolean() == (expectedSource instanceof net.minecraft.world.entity.LivingEntity), "Effect caller kind changed");
        }
        if (mode.equals("reject")) event.reject("checks:effect-refused");
        if (mode.equals("rewrite")) {
            require(data.get("id").getAsString().equals("minecraft:speed") && data.get("category").getAsString().equals("beneficial")
                && data.get("duration").getAsInt() == 80 && data.get("amplifier").getAsInt() == 1
                && data.get("ambient").getAsBoolean() && !data.get("visible").getAsBoolean() && !data.get("showIcon").getAsBoolean(),
                "Attempted effect facts differ from native instance");
            data.addProperty("duration", 1); data.addProperty("amplifier", 99); event.data(data.toString());
        }
        if (mode.equals("nested")) {
            mode = "";
            var origin = expectedOrigin; expectedOrigin = "";
            var recipient = (net.minecraft.world.entity.LivingEntity) event.world().nativeEntity(event.target());
            recipient.addEffect(new MobEffectInstance(MobEffects.JUMP, 25), expectedSource);
            expectedOrigin = origin;
            event.world().marker(event.target(), "minecraft:water_breathing", 25, 0);
            require(event.world().originInstance().equals(origin), "Nested application changed its parent's execution");
        }
    }

    public static void run(MinecraftCombat combat, ServerLevel level) {
        var body = mob(EntityType.COW, level, 2); var source = mob(EntityType.COW, level, 8);
        var immune = mob(EntityType.SPIDER, level, 12);
        var nonliving = EntityType.ARROW.create(level);
        require(nonliving != null, "Nonliving source fixture missing"); nonliving.setPos(4, 100, 2);
        subject = body.getUUID(); events = 0; expectedSource = source; expectedActor = combat.bind(source).ref();
        try {
            mode = "reject";
            require(!body.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 90, 2), source)
                && !body.hasEffect(MobEffects.MOVEMENT_SLOWDOWN) && events == 1, "Refused effect reached native active effects");
            mode = "rewrite";
            require(body.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 80, 1, true, false, false), source), "Accepted effect was refused");
            var accepted = body.getEffect(MobEffects.MOVEMENT_SPEED);
            require(accepted != null && accepted.getDuration() == 80 && accepted.getAmplifier() == 1 && accepted.isAmbient()
                && !accepted.isVisible() && !accepted.showIcon() && events == 2, "Fact edits rewrote native effect parameters");
            mode = "";
            body.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 20, 0), source);
            require(body.getEffect(MobEffects.MOVEMENT_SPEED).getAmplifier() == 1 && body.getEffect(MobEffects.MOVEMENT_SPEED).getDuration() == 80
                && events == 3, "Application gate replaced native stacking");

            expectedSource = null; expectedActor = "";
            body.addEffect(new MobEffectInstance(MobEffects.GLOWING, 40));
            require(events == 4 && body.hasEffect(MobEffects.GLOWING), "Unknown native source did not reach gate");
            expectedSource = nonliving;
            body.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 40), nonliving);
            require(events == 5, "Nonliving caller was discarded");
            expectedSource = source; source.setPos(1000, 100, 2);
            body.addEffect(new MobEffectInstance(MobEffects.DIG_SLOWDOWN, 40), source);
            require(events == 6, "Distant caller was discarded");

            var refused = new MobEffectEvent.Applicable(body, new MobEffectInstance(MobEffects.POISON, 40), source);
            refused.setResult(MobEffectEvent.Applicable.Result.DO_NOT_APPLY); NativeMobEffectGate.apply(refused);
            require(events == 6 && refused.getResult() == MobEffectEvent.Applicable.Result.DO_NOT_APPLY, "Previous Mod refusal was reopened");
            subject = immune.getUUID(); expectedSource = null;
            require(!immune.addEffect(new MobEffectInstance(MobEffects.POISON, 40)) && !immune.hasEffect(MobEffects.POISON)
                && events == 7, "Default application bypassed native immunity");
            var forced = new MobEffectEvent.Applicable(immune, new MobEffectInstance(MobEffects.POISON, 40), null);
            forced.setResult(MobEffectEvent.Applicable.Result.APPLY); NativeMobEffectGate.apply(forced);
            require(events == 8 && forced.getResult() == MobEffectEvent.Applicable.Result.APPLY, "Accepted gate rewrote another Mod applicability decision");
            mode = "reject"; NativeMobEffectGate.apply(forced);
            require(events == 9 && forced.getResult() == MobEffectEvent.Applicable.Result.DO_NOT_APPLY, "Gate could not add a refusal to an allowed attempt");
            subject = body.getUUID(); mode = ""; source.setPos(8, 100, 2);
            expectedSource = source; expectedActor = combat.bind(source).ref();
            combat.marker(combat.bind(source), combat.bind(body), "minecraft:resistance", 35, 0);
            require(events == 10 && body.hasEffect(MobEffects.DAMAGE_RESISTANCE), "Script marker lost its actual scope source");
            expectedSource = null; expectedActor = "";
            combat.marker(combat.bind(body), "minecraft:fire_resistance", 35, 0);
            require(events == 11 && body.hasEffect(MobEffects.FIRE_RESISTANCE), "Source-free marker invented an actor");
            expectedSource = source; expectedActor = combat.bind(source).ref(); expectedOrigin = "checks:effect-origin";
            var origin = new dev.worldcombat.core.runtime.ExecutionOrigin(expectedOrigin, combat.bind(source), 123);
            origin.data("checks:effect-token", "{\"once\":true}"); mode = "nested";
            var scope = new dev.worldcombat.core.runtime.WorldAccess(combat.runtime(), combat.bind(source), null, () -> {}, true, 0, origin);
            scope.marker(combat.bind(body), "minecraft:night_vision", 25, 0);
            require(events == 14 && body.hasEffect(MobEffects.NIGHT_VISION) && body.hasEffect(MobEffects.JUMP)
                && body.hasEffect(MobEffects.WATER_BREATHING), "Nested script/raw applications lost source isolation");
            expectedOrigin = ""; body.addEffect(new MobEffectInstance(MobEffects.DOLPHINS_GRACE, 25), source);
            require(events == 15, "Application origin leaked after returning to native code");
            mark("Native effects verified: real/unknown/nonliving/distant sources, refusal, immutable facts, stacking and native immunity");
        } finally {
            subject = null; mode = ""; expectedSource = null; expectedActor = ""; expectedOrigin = "";
            body.discard(); source.discard(); immune.discard(); nonliving.discard();
        }
    }
}
