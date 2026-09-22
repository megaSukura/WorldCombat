package dev.worldcombat.core.checks;

import dev.worldcombat.core.runtime.*;
import dev.worldcombat.core.world.*;
import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.tags.DamageTypeTags;
import net.minecraft.world.entity.*;
import net.minecraft.world.entity.animal.Cow;
import net.minecraft.world.entity.projectile.ProjectileDeflection;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.TargetBlock;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.ProjectileImpactEvent;
import net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent;
import java.util.*;
import static dev.worldcombat.core.checks.TestWorld.*;

/** Engineering integration checks, isolated from shipped content and authoring examples. */
public final class NativeProjectileChecks {
    private static int age, impacts, completions, nativeEvents, damageEvents;
    private static boolean done, cancel;
    private static Cow actor, target;
    private static double speed = 2, radius = .2;
    private static CombatProjectile projectile;
    private static Entity credited;
    private static String options = "{}";
    private static int beforeUnload;
    public static void launch(ActionContext action) {
        action.commit(1);
        var id = action.projectile(action.origin(), new Point(speed, 0, 0), 0, radius, 40, 80,
            (current, hit) -> { impacts++; if (hit.hitEntity()) require(current.hit(hit, 4, "native", "{}"), "Native damage was rejected"); },
            current -> { completions++; current.finish(); }, options);
        var level = (net.minecraft.server.level.ServerLevel) actor.level();
        projectile = (CombatProjectile) level.getEntity(UUID.fromString(id));
        require(projectile != null && projectile.getOwner() == actor, "Projectile is not a native tracked entity with ownership");
    }
    private static void cast(MinecraftCombat combat) {
        combat.runtime().start("checks:native_projectile", combat.bind(actor), combat.bind(target), null);
    }
    public static void tick(MinecraftServer server) {
        if (done || !CombatServices.CONTENT.ready()) return;
        var combat = CombatServices.get(server); var level = server.overworld();
        try {
            switch (age++) {
                case 0 -> {
                    prepare(server); actor = mob(EntityType.COW, level, 2); target = mob(EntityType.COW, level, 8);
                    NeoForge.EVENT_BUS.addListener((ProjectileImpactEvent event) -> {
                        if (event.getProjectile() instanceof CombatProjectile) { nativeEvents++; if (cancel) event.setCanceled(true); }
                    });
                    NeoForge.EVENT_BUS.addListener((LivingIncomingDamageEvent event) -> {
                        if (event.getSource().getDirectEntity() instanceof CombatProjectile) {
                            require(event.getSource().is(DamageTypeTags.IS_PROJECTILE), "Native projectile damage tag missing");
                            require(event.getSource().getSourcePosition().equals(((CombatProjectile) event.getSource().getDirectEntity()).damageOrigin()), "Impact lost native shield/knockback origin");
                            damageEvents++; credited = event.getSource().getEntity();
                        }
                    });
                    cast(combat);
                }
                case 10 -> {
                    require(target.getHealth() == 6 && impacts == 1 && completions == 1 && nativeEvents == 1 && damageEvents == 1 && credited == actor,
                        "Native hit/attribution/once-only completion failed: " + target.getHealth() + "/" + impacts + "/" + completions + "/" + nativeEvents + "/" + damageEvents);
                    clean(combat); target.setHealth(10); target.invulnerableTime = 0; cancel = true; cast(combat);
                }
                case 20 -> {
                    require(target.getHealth() == 10 && impacts == 1 && nativeEvents > 1, "Canceled NeoForge impact applied gameplay");
                    combat.runtime().cancelActor(combat.bind(actor), "native-cancel"); cancel = false;
                    require(projectile.isRemoved(), "Action cancellation retained native entity");
                    level.setBlockAndUpdate(new BlockPos(5,100,2), Blocks.TARGET.defaultBlockState()); speed = 8; cast(combat);
                }
                case 23 -> {
                    require(level.getBlockState(new BlockPos(5,100,2)).getValue(net.minecraft.world.level.block.state.properties.BlockStateProperties.POWER) > 0, "Native target block did not receive onProjectileHit");
                    require(target.getHealth() == 10 && impacts == 2, "High-speed projectile tunneled through a block");
                    level.setBlockAndUpdate(new BlockPos(5,100,2), Blocks.AIR.defaultBlockState());
                    speed = 1; radius = 2; target.moveTo(8, 100, 4.3); cast(combat);
                }
                case 35 -> {
                    require(target.getHealth() == 6 && impacts == 3, "Native collision margin/broad phase ignored radius");
                    target.moveTo(8,100,2); target.setHealth(10); target.invulnerableTime = 0; actor.invulnerableTime = 0;
                    speed = 1; radius = .2; cast(combat);
                    projectile.setPos(5, projectile.getY(), 2); // Reflect an incoming shot after it has left its shooter.
                    require(projectile.deflect(ProjectileDeflection.REVERSE, target, target, false), "Native deflection refused");
                }
                case 40 -> {
                    require(actor.getHealth() == 6 && target.getHealth() == 10 && credited == target, "Deflected projectile did not use its native new owner");
                    clean(combat); actor.setHealth(10); actor.invulnerableTime = 0;
                    cast(combat); actor.discard();
                }
                case 45 -> {
                    require(projectile.isRemoved() && target.getHealth() == 10, "Actor departure retained projectile damage"); clean(combat);
                    long after = combat.runtime().now();
                    for (int i = 0; i < 260; i++) level.playSound(null, target.getX(), target.getY(), target.getZ(),
                        net.minecraft.sounds.SoundEvents.NOTE_BLOCK_HARP.value(), net.minecraft.sounds.SoundSource.BLOCKS, 1, 1);
                    var heard = combat.heard(combat.bind(target), 0, 16);
                    require(Arrays.stream(heard).filter(sound -> sound.tick() == after && sound.sound().equals("minecraft:block.note_block.harp")).count() == 260,
                        "Native sounds or high-volume observations were truncated");
                    actor = mob(EntityType.COW, level, 2); target.moveTo(9,100,5); target.setHealth(10); target.invulnerableTime = 0;
                    speed = 1.5; options = "{\"homing\":{\"target\":\"" + target.getStringUUID() + "\",\"turn\":30}}"; cast(combat);
                }
                case 60 -> {
                    require(target.getHealth() == 6 && credited == actor, "Authored homing options did not reach native steering"); clean(combat);
                    target.moveTo(12,100,2); target.setHealth(10); target.invulnerableTime = 0;
                    level.setBlockAndUpdate(new BlockPos(5,100,2), Blocks.STONE.defaultBlockState());
                    level.setBlockAndUpdate(new BlockPos(5,101,2), Blocks.STONE.defaultBlockState());
                    speed = 1; options = "{\"bounce\":1,\"restitution\":1}"; cast(combat);
                }
                case 66 -> {
                    require(!projectile.isRemoved() && projectile.getDeltaMovement().x < 0 && projectile.getX() < 5, "Native bounce did not retain its reflected motion");
                    beforeUnload = completions; projectile.remove(Entity.RemovalReason.UNLOADED_TO_CHUNK);
                    require(combat.runtime().projectiles().size() == 0, "Unloaded flight retained managed ownership");
                }
                case 69 -> {
                    require(completions == beforeUnload, "Unloaded flight dispatched completion");
                    combat.runtime().cancelActor(combat.bind(actor), "native-cancel"); clean(combat);
                    done = true; mark("PASS native projectiles: tracking, sweep, impact cancellation, target block, radius, deflection attribution, homing, bounce, unload, scope cleanup and sound observations");
                }
            }
        } catch (Throwable error) { done = true; error.printStackTrace(); mark("FAIL native projectiles at " + age + ": " + error); }
    }
}
