/**
 * 太晶爆发 / terablast —— 注册与动作。
 *
 * 一幕聚晶（提交前 `windup` 播预告，形态由物攻/特攻之比决定），一幕出手（提交后放出
 * 晶冲或晶束投射物），一幕命中（共享 `impact` 结算，按形态顶开目标并播碎裂），撞墙落空
 * 播 `fizzle`。伤害属性取原生主属性、分类取较高一面，都由 parameters.ts 的伤害段 resolve 读取，
 * 预览与命中走同一份。世界不留持久物：晶体命中即碎。
 */
namespace PokemonSkills {
    const TERABLAST_SCENE = "world_combat:move_terablast";

    function terablastForm(action: CombatAction): string {
        return p("terablast", "edge", action) > 0 ? "ram" : "beam";
    }

    /** Native primary type, the lowercase id the client maps through the shared type colour table. */
    function terablastType(action: CombatAction): string {
        var pokemon = CobblemonCombat.pokemon(action.actor());
        return pokemon ? String(pokemon.type(0)) : "";
    }

    function terablastStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        var form = terablastForm(action), world = action.world(),
            power = p("terablast", "power", action),
            direction = aim(action),
            speed = form === "ram" ? p("terablast", "ramSpeed", action) : p("terablast", "beamSpeed", action),
            radius = p("terablast", "collisionRadius", action);
        sound(action, "minecraft:block.amethyst_block.chime");
        var flight = LivingActions.projectile(action, {
            speed: speed, range: action.range(), radius: radius, direction: direction,
            appearance: form === "ram"
                ? { sprite: "cobblemon:generic/ice/iceshard", scale: 1.3, glow: true }
                : { sprite: "cobblemon:generic/orb/orb", scale: 1.5, tint: 0xA9D6FF, glow: true },
            impact: function (current: CombatAction, hit: CombatImpact) { terablastImpact(current, hit, form === "ram", direction); }
        }, done);
        WorldFeedback.emit(world, TERABLAST_SCENE, 1, action.origin(), { moment: form, projectile: flight, intensity: 1, scale: 1, form: form, type: terablastType(action) }, 80);
    }

    function terablastImpact(current: CombatAction, hit: CombatImpact, heavy: boolean, direction: CombatPoint): void {
        var world = current.world(), target = hit.target(), point = hit.position();
        if (target === null) {
            WorldFeedback.emit(world, TERABLAST_SCENE, 1, point, { moment: "fizzle", intensity: 1, scale: 1 }, 30);
            return;
        }
        var body = world.observe(target), before = body ? body.health() : 0, maximum = body ? Math.max(1, body.maxHealth()) : 1;
        var landed = impact(current, hit, "terablast", p("terablast", "power", current), {});
        var after = world.valid(target) ? world.observe(target) : null, dealt = before - (after ? after.health() : 0);
        var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
        world.sound("minecraft:block.amethyst_cluster.break", point, 16, "{}");
        WorldFeedback.emit(world, TERABLAST_SCENE, 1, point,
            { moment: "impact", target: String(target.ref()), intensity: intensity, scale: 1, type: terablastType(current),
                bursts: Math.round(6 + intensity * 8), cover: 0.9 + intensity * 0.35 }, 40);
        WorldFeedback.text(world, point, heavy ? "world_combat.move.terablast.text.ram" : "world_combat.move.terablast.text.beam", [], 40);
        if (landed && heavy && world.valid(target))
            world.displace(target, direction.scale(p("terablast", "push", current)));
    }

    define({ id: "terablast", name: "太晶爆发",
        description: "把自己凝成太晶：物攻更高就化作晶冲顶开对手，否则放出晶束；伤害属性取自身主属性，物理或特殊由较高的一面决定。",
        uses: ["远程爆发", "看家本领"], kind: "enemy", range: 18, prepare: 8, active: 0, recover: 8, cooldown: 40, style: "tera",
        defaults: {}, fields: [],
        indicator: function () { return { radius: 18, geometry: "line", style: "tera", label: "太晶爆发" }; },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            action.present("world_combat:terablast:" + action.id(), TERABLAST_SCENE, 1, action.origin(),
                JSON.stringify({ moment: "windup", form: terablastForm(action), type: terablastType(action) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            terablastStrike(action, done);
        }
    });
}
