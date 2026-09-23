/**
 * 硬撑 / facade 的出手方式。
 *
 * 念头的形状：带着身上的异常沉身压低（brace）→ 沿瞄准方向逐刻冲出去（drive）→ 撞上活体的一刻走共享 impact 结算接触伤害，
 * 再把目标沿冲撞方向顶开（impact + shove）；正前方有方块或被顶到走不动就提前结束。一幕做透：压身、冲撞、撞实、顶开。
 * 身上的异常种类决定冲击的色相（燃烧橙、中毒紫、麻痹黄、冰冻青），异常本身不因这一下消失。
 * 提交前只有 7 刻的压低准备（windup 预告，用 sense 读异常用于上色），提交后才触碰世界。
 */
namespace PokemonSkills {
    const facadeScene = "world_combat:move_facade";
    const facadeGritText = "world_combat.move.facade.text.grit";
    const facadeWhiffText = "world_combat.move.facade.text.whiff";

    /** 身上带着的异常种类，用于给冲击上色：0 无、1 灼伤、2 中毒/剧毒、3 麻痹、4 冰冻。 */
    function facadeAffliction(world: CombatWorld, actor: CombatActor): number {
        if (CombatStatus.has(world, actor, "burn")) return 1;
        if (CombatStatus.has(world, actor, "poison")) return 2;
        if (CombatStatus.has(world, actor, "paralysis")) return 3;
        if (CombatStatus.has(world, actor, "frozen")) return 4;
        return 0;
    }
    function facadeTint(code: number): number {
        if (code === 1) return 0xFF7A1E;
        if (code === 2) return 0x9B4DCA;
        if (code === 3) return 0xF2D93A;
        if (code === 4) return 0x8FE3F5;
        return 0xE8D8B0;
    }

    define({
        freeMovement: true,
        id: "facade",
        name: "Facade",
        description: "带着身上的异常硬顶过去：处于中毒／剧毒、灼伤、麻痹或冰冻时威力翻倍，越剩不下命也越狠。撞实后把目标顶开；开启“变本加厉”还能打得更重，但会反噬自己。",
        uses: ["带伤硬顶", "残血时反打", "把贴身之敌顶开"],
        kind: "enemy",
        range: 4,
        prepare: 7,
        active: 26,
        recover: 8,
        cooldown: 40,
        style: "contact",
        defaults: { brutal: false, ai: { maxChase: 9, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["facade"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var brutal = !!(config && config.brutal);
            return {
                prepare: p("facade", "prepare", context),
                recover: p("facade", "recover", context) + (brutal ? 2 : 0),
                cooldown: p("facade", "cooldown", context) + (brutal ? 4 : 0)
            };
        },
        windup: function (action, config, prepare) {
            var code = facadeAffliction(action.sense(), action.actor());
            action.present("world_combat:move_facade:brace", facadeScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", affliction: code, tint: facadeTint(code), essence: code > 0 ? 10 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p("facade", "slam", action);
            const traceAhead = p("facade", "traceAhead", action);
            const radius = p("facade", "collisionRadius", action);
            const code = facadeAffliction(world, action.actor());
            const tint = facadeTint(code);
            const intensity = Math.max(0.5, Math.min(2.2, p("facade", "power", action) / 70));
            let travelled = 0;
            action.present("world_combat:move_facade:drive", facadeScene, 1, action.origin(),
                JSON.stringify({ moment: "drive", affliction: code, tint: tint, essenceRate: code > 0 ? Math.round(10 * intensity) : 0, scale: radius / 0.55 }));
            function advance(current: CombatAction): void {
                const body = current.world();
                const origin = current.origin();
                const step = Math.min(p("facade", "chargeSpeed", current), Math.max(0, length - travelled));
                if (step <= 0) { done(current); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const power = p("facade", "power", current);
                    const landed = impact(current, hit, "facade", power, { contact: true });
                    const target = hit.target();
                    if (target !== null && body.valid(target)) {
                        body.displace(target, direction.scale(p("facade", "push", current)));
                        const point = hit.position(), ref = String(target.ref());
                        const force = Math.max(0.5, Math.min(2.2, power / 70));
                        WorldFeedback.emit(body, facadeScene, 1, point,
                            { moment: "impact", target: ref, intensity: force, affliction: code, tint: tint,
                              flash: Math.round(14 * force), dust: Math.round(30 * force), grit: Math.round(46 * force),
                              essence: code > 0 ? Math.round(30 * force) : 0 }, 30);
                        WorldFeedback.emit(body, facadeScene, 1, point, { moment: "shove", target: ref }, 22);
                        WorldFeedback.text(body, point, facadeGritText, [], 28);
                        sound(current, "minecraft:entity.player.attack.strong");
                    }
                    if (landed && p("facade", "strain", current) > 0) {
                        const self = body.observe(current.actor());
                        if (self !== null) body.health(current.actor(), -self.maxHealth() * p("facade", "strain", current), "world_combat:facade_strain");
                    }
                    done(current);
                    return;
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? body.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p("facade", "minimumMove", current) || travelled >= length) {
                    WorldFeedback.emit(body, facadeScene, 1, body.observe(current.actor()) ? body.observe(current.actor())!.position() : origin, { moment: "whiff" }, 18);
                    WorldFeedback.text(body, origin, facadeWhiffText, [], 22);
                    sound(current, "minecraft:entity.player.attack.sweep");
                    done(current);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
