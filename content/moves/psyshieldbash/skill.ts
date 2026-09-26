/**
 * 屏障猛攻 / psyshieldbash 的出手方式。
 *
 * 念头的形状：起手把意念编成一层半透明的护盾裹住全身（windup，提交前只播预告）→ 提交的一刻护盾成形并
 * **当场加固使用者**（NativeEffects.boostWindow 防 +N，并挂上共享身份 `world_combat:status/psyshield`）→
 * 带着盾沿瞄准方向冲出去（drive）→ 撞实的一刻壳在接触面炸成片、把目标顶开（impact）→
 * 碎片回卷重新合拢（reform）。原生命中 90 落成 `wobble`：瞄准可能偏开，偏开了不结算伤害，但壳已经成形、
 * 防御照拿。选取 aim：可点方向或实体、也可空放，空放只为立起这层防御；撞地形停止。
 * 壳的画面用 `WorldFeedback.onEffect` 绑在 boostWindow 本身，随它自然到期或提前清除一起收掉，
 * 不表现超出这层防御的容量。两幕：drive → impact + reform。提交后才触碰世界。
 */
namespace PokemonSkills {
    const psyshieldbashScene = "world_combat:move_psyshieldbash";
    const PsyshieldShell = "world_combat:psyshieldbash_shell";
    const psyshieldShellText = "world_combat.move.psyshieldbash.text.shell";
    const psyshieldHitText = "world_combat.move.psyshieldbash.text.hit";
    const psyshieldMissText = "world_combat.move.psyshieldbash.text.miss";

    define({
        freeMovement: true,
        id: "psyshieldbash",
        name: "Psyshield Bash",
        description: "把意念编成一层护盾裹住全身，带盾沿瞄准方向冲撞：护盾成形的瞬间就加固使用者的防御（撞空、空放也照拿），撞实造成接触伤害并把目标顶开；瞄准可能偏开。",
        uses: ["带盾撞人并顺手加固自己", "在挨打之前先升防御（也可朝空处放）", "用厚壳正面顶开一个目标"],
        kind: "aim",
        range: 4,
        maxRange: 6,
        prepare: 9,
        active: 28,
        recover: 9,
        cooldown: 52,
        style: "psychic",
        defaults: { harden: false, ai: { maxChase: 8, shellFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("psyshieldbash", "charge", pokemon) : 3.6) + 0.6, geometry: "line", style: "psychic", color: 0xB36BFF, label: "屏障猛攻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["psyshieldbash"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const harden = !!(config && config.harden);
            return {
                prepare: p("psyshieldbash", "prepare", context) + (harden ? 3 : 0),
                recover: p("psyshieldbash", "recover", context),
                cooldown: p("psyshieldbash", "cooldown", context) + (harden ? 8 : 0),
                range: p("psyshieldbash", "charge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_psyshieldbash:focus", psyshieldbashScene, 1, action.origin(),
                JSON.stringify({ moment: "focus", harden: !!(config && config.harden) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(psyshieldbashScene);
            const world = action.world();
            const actor = action.actor();
            const length = p("psyshieldbash", "charge", action);
            const speed = p("psyshieldbash", "dashSpeed", action);
            const radius = p("psyshieldbash", "shellRadius", action);
            const power = p("psyshieldbash", "bash", action);
            const stages = Math.max(1, Math.round(p("psyshieldbash", "boostStages", action)));
            const shellTicks = Math.max(20, Math.round(p("psyshieldbash", "shellTicks", action)));
            const wobble = p("psyshieldbash", "wobble", action);
            const push = p("psyshieldbash", "push", action);
            const base = aim(action);
            const angle = (world.random() * 2 - 1) * wobble * Math.PI / 180;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const direction = WorldCombat.point(base.x() * cos - base.z() * sin, 0, base.x() * sin + base.z() * cos).unit();
            const scale = radius / 0.48;
            const intensity = Math.max(0.5, Math.min(2.2, power / 75));
            let travelled = 0, settled = false;

            // 结壳：护盾成形的这一刻就加固使用者，撞空、空放也照拿——这是本招的底。
            const definition = String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
            world.effects(actor, definition).forEach(function (view) {
                const data = JSON.parse(String(view.data()));
                if (data.source === "world_combat:move/psyshieldbash") NativeEffects.windowClose(world, view.id());
            });
            const shell = MobEffects.apply(world, actor, PsyshieldShell, shellTicks, 0);
            const shellWindow = shell ? NativeEffects.boostWindow(world, actor, { def: stages }, shellTicks, "world_combat:move/psyshieldbash", shell) : 0;
            const self = world.observe(actor);
            if (self !== null) {
                // 壳的持续画面绑在这层真正的 boostWindow 上，随它自然到期或提前清除一起收掉。
                if (shellWindow)
                    WorldFeedback.onEffect(world, shellWindow, "world_combat:move_psyshieldbash:shell", psyshieldbashScene, 1, self.position(),
                        { moment: "shell", scale: scale, stages: stages, ticks: shellTicks, intensity: intensity });
                WorldFeedback.text(world, self.position().plus(WorldCombat.point(0, 1.4, 0)), psyshieldShellText, [stages], 26);
            }
            movementScenes.show(action, "drive", action.origin(), { moment: "drive", scale: scale, intensity: intensity });
            sound(action, "minecraft:block.beacon.power_select");

            function finish(current: CombatAction, landed: boolean): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    if (!landed) {
                        WorldFeedback.emit(scope, psyshieldbashScene, 1, body.position(), { moment: "miss", scale: scale }, 22);
                        WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), psyshieldMissText, [], 22);
                    }
                    WorldFeedback.emit(scope, psyshieldbashScene, 1, body.position(),
                        { moment: "reform", scale: scale, stages: stages, shards: stages * 14, intensity: intensity }, 30);
                }
                sound(current, landed ? "cobblemon:impact.psychic" : "minecraft:block.beacon.deactivate");
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { finish(current, false); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const point = hit.position();
                    const landed = impact(current, hit, "psyshieldbash", power, { damage: damageSpec("psyshieldbash", "bash"), contact: true });
                    WorldFeedback.emit(scope, psyshieldbashScene, 1, point,
                        { moment: "impact", target: target !== null ? String(target.ref()) : "", scale: scale,
                            stages: stages, intensity: intensity }, 28);
                    if (landed && target !== null && scope.valid(target)) {
                        scope.hitDisplace(target, direction.scale(push));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), psyshieldHitText, [], 24);
                    }
                    finish(current, landed);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < p("psyshieldbash", "minimumMove", current) || travelled >= length) { finish(current, false); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
