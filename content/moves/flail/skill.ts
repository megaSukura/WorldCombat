/**
 * 抓狂 / flail 的出手方式。
 *
 * 核心念头：人越虚弱越抓狂——朝身前一个扇面失控地乱甩，血越少甩出的下数越多、每下也越重。
 * 这一招不挑目标、不挑方向，扇面里的人都会被扫到；它卖的是「我还剩多少血，就有多疯」。
 *
 * 三幕：
 *   起（windup，提交前）：重心下沉、身上腾起一股燥气，扇面预告随下数铺开。
 *   乱（swing → hit）：提交后朝目标所在的扇面连甩 `swings` 下；每下判定一个扇形区域，
 *       扇内的非友方各挨一次 `swipe`（接触）并被往背离方向挤开；扇面顶点与服务端判定是同一组。
 *   收（finish）：打满下数或扇面里没人时收势，浮字报出这一串打中了几下。
 *
 * 配置 `reckless`（拼命式）由公式加码、由这里在每下结算时自损：残血时可能把自己打空。
 */
namespace PokemonSkills {
    const flailScene = "world_combat:move_flail";
    const flailHitText = "world_combat.move.flail.text.hit";
    const flailMissText = "world_combat.move.flail.text.miss";
    const flailRecklessText = "world_combat.move.flail.text.reckless";

    /** 扇形轮廓：origin 起，朝 heading 张开 angle 度、半径 reach；判定与表现共用同一组顶点。 */
    function flailFan(origin: CombatPoint, heading: CombatPoint, reach: number, angle: number): number[][] {
        const flat = WorldCombat.point(heading.x(), 0, heading.z());
        const dir = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const base = Math.atan2(dir.z(), dir.x());
        const half = Math.max(12, Math.min(88, angle / 2)) * Math.PI / 180;
        const points: number[][] = [[origin.x(), origin.y(), origin.z()]];
        const steps = 8;
        for (let i = 0; i <= steps; i++) {
            const a = base - half + 2 * half * i / steps;
            points.push([origin.x() + Math.cos(a) * reach, origin.y(), origin.z() + Math.sin(a) * reach]);
        }
        return points;
    }

    define({
        id: "flail",
        name: "Flail",
        description: "朝身前一个扇面失控地乱打，血量越少甩出的下数越多、每下也越重；扇面里的敌人都会被扫到并被挤开。拼命式更狠，但每一下都要自损。",
        uses: ["残血时一口气甩出一整串乱打", "被贴身时把身前扇面里的人一起扫开", "把追击者从脸上挤出去", "在血线低到危险的局面里做最后一搏"],
        kind: "enemy",
        range: 2.4,
        maxRange: 3.4,
        prepare: 5,
        active: 0,
        recover: 6,
        cooldown: 26,
        maximumTicks: 160,
        style: "flurry",
        defaults: { reckless: false, ai: { maxChase: 4, finishLow: true, recklessFloor: 0.22 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("flail", "reach", pokemon), geometry: "area", style: "flurry", color: 0xE8C9A0,
                label: config && config.reckless === true ? "拼命乱打" : "抓狂乱打" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["flail"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            const reckless = !!(config && config.reckless);
            return {
                prepare: Math.round(p("flail", "prepare", context) + (reckless ? 1 : 0)),
                recover: Math.round(p("flail", "recover", context)),
                cooldown: Math.round(p("flail", "cooldown", context) + (reckless ? 4 : 0)),
                active: skills["flail"].active,
                range: p("flail", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const reckless = !!(config && config.reckless);
            action.present("flail:windup", flailScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", tricky: reckless ? 1 : 0, reach: p("flail", "reach", action),
                    moves: Math.round(p("flail", "swings", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const body = world.observe(actor);
            if (body === null || target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p("flail", "swipe", action);
            const swings = Math.max(2, Math.round(p("flail", "swings", action)));
            const reach = Math.max(1.4, p("flail", "reach", action));
            const angle = Math.max(70, Math.min(150, p("flail", "arc", action)));
            const gap = Math.max(3, Math.round(p("flail", "gap", action)));
            const sparks = Math.max(6, Math.round(p("flail", "sparks", action)));
            const push = p("flail", "push", action);
            const reckless = !!(config && config.reckless);
            const recoil = reckless ? Math.max(0.01, p("flail", "recoil", action)) : 0;
            const scale = Math.max(0.6, Math.min(2.0, reach / 2.0));
            let index = 0, total = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const self = scope.observe(current.actor());
                const at = self !== null ? self.position().plus(WorldCombat.point(0, self.height() + 0.3, 0)) : current.origin();
                WorldFeedback.text(scope, at, total > 0 ? flailHitText : flailMissText, total > 0 ? [total, index] : [], 24);
                done(current);
            }

            function swing(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const self = scope.observe(current.actor());
                if (self === null) { finish(current); return; }
                if (index >= swings) { finish(current); return; }
                const victim = scope.actor(targetRef);
                const victimBody = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                const origin = self.position();
                const aim = victimBody !== null ? victimBody.position() : current.targetPosition();
                let heading = aim.minus(origin);
                if (heading.length() < 0.05) heading = current.direction();
                current.face(aim, 24, 24);
                const fan = flailFan(origin, heading, reach, angle);
                const intensity = Math.max(0.6, Math.min(2.2, power / 22));
                const rage = Math.round(Math.max(0, 1 - self.health() / Math.max(1, self.maxHealth())) * 46);
                let hits = 0;

                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, heading, reach, angle, { below: 1.4, above: 2.2 }),
                    function (enemy, facts) {
                        if (String(enemy.ref()) === String(current.actor().ref())) return;
                        if (!hurt(current, enemy, "flail", power, { damage: damageSpec("flail", "swipe"), contact: true })) return;
                        hits++; total++;
                        const away = facts.position().minus(origin);
                        if (scope.valid(enemy) && away.length() > 0.15)
                            scope.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                        WorldFeedback.emit(scope, flailScene, 1, facts.position(),
                            { moment: "hit", target: String(enemy.ref()), index: index, swings: swings,
                                sparks: sparks, rage: rage, scale: scale, intensity: intensity }, 18);
                    });

                WorldFeedback.emit(scope, flailScene, 1, origin,
                    { moment: "swing", path: fan, index: index, swings: swings,
                        direction: [heading.x(), heading.y(), heading.z()], sparks: sparks, rage: rage, scale: scale,
                        intensity: intensity, miss: hits === 0 ? 1 : 0 }, 16);
                sound(current, index === swings - 1 ? "minecraft:entity.player.attack.strong" : "minecraft:entity.player.attack.weak");

                if (reckless && recoil > 0 && scope.valid(current.actor())) {
                    const own = scope.observe(current.actor());
                    if (own !== null) {
                        scope.health(current.actor(), -own.maxHealth() * recoil, "world_combat:flail_recoil");
                        WorldFeedback.text(scope, own.position().plus(WorldCombat.point(0, own.height() + 0.2, 0)), flailRecklessText, [], 16);
                    }
                }

                index++;
                if (index >= swings) { finish(current); return; }
                current.after(gap, function (next: CombatAction) { swing(next); });
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            swing(action);
        }
    });
}
