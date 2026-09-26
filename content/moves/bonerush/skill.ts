/**
 * 骨棒乱打 / bonerush —— 出手方式。
 *
 * 核心念头：**掷骨夯地**——施法者把手里的硬骨一下下抛出去，夯在目标脚下的地面上；冲击沿地层钻到对手脚底，
 *   所以是地面属性、不接触。落点只留会自己散去的尘痕，不动地表；最后一下最重。它是本族唯一把骨头离手、
 *   并让冲击从落点地面传开的招。
 *
 * 幕：
 *   起（draw，提交前）：拔骨、拧身，手里聚起一圈骨白光；`action.present`，可打断、不花 PP。
 *   掷（throw，提交后）：`strikes` 击。每一击朝目标当前所在处抛一枚骨头（外观是 `minecraft:bone`，按 `boomArc`
 *       走弧线）；骨头在真实接触点落定即为「夯」，结算一段 `quake` 地面伤害——落点 `shock` 半径内、真正贴地
 *       的非友方各吃一下、被向上顶起 `lift`；只留一段会散去的尘痕 `crack`。最后一击威力 ×`finish`。
 *   收（settle）：这一串夯完收势，余尘落定。
 *
 * 选取 `kind: "aim"`：可以点任意阵营实体，也可以只给一个世界点或方向自由抛骨；骨头撞墙就在真实接触面结束，
 *   落在哪里震哪里，不会在远处的锁点震地。飞行/悬空的目标不吃地面震动。
 *
 * 与同族分开：乱抓会绕圈换位、乱击是站定定点突刺、扫尾拍打是原地整圈旋尾；只有骨棒乱打隔着距离掷骨、留下地痕，
 *   反制方式是远离落点或站到不平的地面上（骨头弧线会偏），也可在掷出后走开让骨头砸空。
 *
 * 配置 `fissure`（裂地式）由 resolve 改时序、由公式改威力／震波／击数与骨速；提交后才触碰世界。
 */
namespace PokemonSkills {
    define({
        id: bonerushId,
        cooldownParameter: "recharge",
        name: "Bone Rush",
        description: "把手里的硬骨一枚枚按弧线抛出，夯在目标脚下的地面上：冲击沿地层钻到落点周围贴地敌人的脚底（地面伤害、不接触），落点只留会自己散去的尘痕，最后一击最重。可以点敌人，也可以只朝一个世界点自由抛骨；骨头撞墙就在接触面结束，砸在哪震哪，飞行或悬空的目标不吃震动。重夯式每击更重、可到 5 击，裂地式震波更大、尘痕更久。",
        uses: ["隔着距离把骨头一下下夯到目标脚下", "落点震波把一小片地面的人一起掀起", "裂地式用更久的尘痕占住战场", "只给一个世界点自由抛骨"],
        kind: "aim",
        range: 7,
        maxRange: 13,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 28,
        maximumTicks: 260,
        style: "bone",
        defaults: { fissure: false, ai: { maxChase: 11, cluster: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[bonerushId], detail: { values: config } };
            return { radius: p(bonerushId, "throwRange", context), geometry: "line", style: "bone", color: 0xEAE0C8,
                label: config && config.fissure === true ? "骨棒乱打·裂地式" : "骨棒乱打·重夯式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[bonerushId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(bonerushId, "tempo", context)),
                recover: Math.round(p(bonerushId, "settle", context)),
                cooldown: Math.round(p(bonerushId, "recharge", context)),
                active: 0,
                range: p(bonerushId, "throwRange", context)
            };
        },
        windup: function (action, config, prepare) {
            const strikes = Math.max(2, Math.min(5, Math.round(p(bonerushId, "strikes", action))));
            const dust = Math.max(6, Math.round(p(bonerushId, "dust", action)));
            action.present("bonerush:draw:" + action.id(), bonerushScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", strikes: strikes, dust: dust, windup: prepare,
                    fissure: config && config.fissure === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const targetRef = target !== null && world.valid(target) ? String(target.ref()) : "";
            const power = p(bonerushId, "quake", action);
            const strikes = Math.max(2, Math.min(5, Math.round(p(bonerushId, "strikes", action))));
            const gap = Math.max(3, Math.round(p(bonerushId, "gap", action)));
            const shock = p(bonerushId, "shock", action);
            const speed = Math.max(0.5, p(bonerushId, "flight", action));
            const gravity = Math.max(0.01, p(bonerushId, "boomArc", action));
            const boneRadius = Math.max(0.12, p(bonerushId, "boneRadius", action));
            const lift = p(bonerushId, "lift", action);
            const finishMul = p(bonerushId, "finish", action);
            const accuracy = Math.max(0.05, Math.min(0.99, p(bonerushId, "accuracy", action)));
            const crackTicks = Math.max(60, Math.round(p(bonerushId, "crack", action)));
            const dust = Math.max(8, Math.round(p(bonerushId, "dust", action)));
            // 骨头飞行是持续过程：每次 execute 建一个 actionScenes，逐枚绑定真实投递，撞到就停、收势随 finish。
            const scenes = WorldFeedback.actionScenes(bonerushScene);
            let index = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, bonerushScene, 1, at,
                    { moment: "settle", strikes: strikes, landed: landed, dust: dust, shock: shock }, 20);
                if (landed > 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), bonerushTallyText, [landed], 22);
                finish(current);
            }

            function strike(current: CombatAction): void {
                if (settled) return;
                if (index >= strikes) { settle(current); return; }
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const victim = targetRef === "" ? null : scope.actor(targetRef);
                const vbody = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                const origin = self.position().plus(WorldCombat.point(0, self.height() * 0.5, 0));
                const aimPoint = vbody !== null ? vbody.position() : current.targetPosition();
                let direction = LivingActions.ballistic(origin, aimPoint, speed, gravity);
                if (direction === null) direction = aim(current);
                // 命中 90：共享偏角让这一枚骨头真的会扔歪；目标走开就砸在空地上。
                direction = NativeSemantics.aim(current, move, direction, 1.1);
                const shot = index + 1;
                const hitPower = power * (shot >= strikes ? finishMul : 1);
                const distance = Math.max(1.5, aimPoint.minus(origin).length());
                const life = Math.max(30, Math.round(distance / Math.max(0.3, speed)) + 30);
                const key = "throw" + shot;
                sound(current, "minecraft:entity.arrow.shoot");
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: distance + 3, radius: boneRadius, direction: direction, gravity: gravity,
                    lifetime: life,
                    appearance: { item: "minecraft:bone", spin: true, scale: 0.9 } as any,
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        const scope2 = inner.world();
                        const at = hit.position();
                        const struck = hit.target();
                        // 骨头在真实接触点停下：飞行轨迹随之收掉，不再继续拖尾。
                        scenes.stop(inner, key);
                        WorldFeedback.emit(scope2, bonerushScene, 1, at,
                            { moment: "slam", index: shot, strikes: strikes, shock: shock, dust: dust,
                                intensity: Math.max(0.5, Math.min(2.4, hitPower / 28)) }, 22);
                        scope2.sound("minecraft:block.bone_block.break", at, 14, "{}");
                        // 只有真正贴地的目标才沿地层吃到震动；飞行/悬空的不算。
                        WorldGeometry.selectEnemies(scope2, WorldGeometry.ring(at, 0, shock, { below: 2.0, above: 2.0 }),
                            function (other, facts) {
                                // 真实贴地才算：原生 grounded 或脚高贴着脚下地面，任一成立；飞行/悬空的不吃震动。
                                const feet = facts.position().y() - facts.height() * 0.5;
                                const ground = WorldGeometry.ground(scope2, facts.position(), 2).y();
                                if (!facts.grounded() && Math.abs(feet - ground) > 0.7) return;
                                if (!hurt(inner, other, bonerushId, hitPower, { damage: damageSpec(bonerushId, "quake") })) return;
                                landed++;
                                const pos = facts.position();
                                let lifted = false;
                                if (scope2.valid(other) && lift > 0.02) lifted = scope2.hitDisplace(other, WorldCombat.point(0, lift, 0)) > 0.02;
                                WorldFeedback.emit(scope2, bonerushScene, 1, pos,
                                    { moment: "hit", target: String(other.ref()), index: shot, strikes: strikes, dust: dust,
                                        lifted: lifted ? 1 : 0, intensity: Math.max(0.5, Math.min(2.4, hitPower / 28)) }, 20);
                            });
                        if (struck !== null && scope2.valid(struck)) scope2.sound("cobblemon:impact.ground", at, 14, "{}");
                        // 地痕只是会自己散去的尘，不改动地表；crack 参数改为这段尘痕能留多久。
                        WorldFeedback.emit(scope2, bonerushScene, 1, at,
                            { moment: "crack", radius: Math.max(1.0, shock * 0.9), linger: crackTicks, dust: dust,
                                index: shot, strikes: strikes, shock: shock }, 26);
                    }
                }, function (inner: CombatAction) {
                    scenes.stop(inner, key);
                    inner.after(gap, function (next: CombatAction) { strike(next); });
                });
                scenes.show(current, key, origin,
                    { moment: "throw", projectile: flight, index: shot, strikes: strikes, shock: shock, dust: dust,
                        intensity: Math.max(0.5, Math.min(2.4, hitPower / 28)) });
                index = shot;
            }

            sound(action, "minecraft:block.bone_block.hit");
            WorldFeedback.emit(world, bonerushScene, 1, action.origin(),
                { moment: "draw", strikes: strikes, dust: dust, shock: shock }, 16);
            // 先让起手表现播一下，再掷出第一枚骨头。
            action.after(4, strike);
        }
    });
}
