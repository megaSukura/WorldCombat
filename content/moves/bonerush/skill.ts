/**
 * 骨棒乱打 / bonerush —— 出手方式。
 *
 * 核心念头：**掷骨夯地**——施法者把手里的硬骨一下下抛出去，夯在目标脚下的地面上；冲击沿地层钻到对手脚底，
 *   所以是地面属性、不接触。每一击都把落点那层地表震裂，留下会自己消失的地痕；最后一下最重。它是本族唯一
 *   把骨头离手、并且在地面留下裂痕的招。
 *
 * 幕：
 *   起（draw，提交前）：拔骨、拧身，手里聚起一圈骨白光；`action.present`，可打断、不花 PP。
 *   掷（throw，提交后）：`strikes` 击。每一击朝目标当前所在处抛一枚骨头（外观是 `minecraft:bone`，按 `boomArc`
 *       走弧线）；骨头落定即为「夯」，结算一段 `quake` 地面伤害——落点 `shock` 半径内的非友方各吃一下、
 *       被向上顶起 `lift`，同时把那层地表震成裂痕 `crack` 刻。最后一击威力 ×`finish`。
 *   收（settle）：这一串夯完收势，余尘落定。
 *
 * 与同族分开：乱抓会绕圈换位、乱击是站定定点突刺、扫尾拍打是原地整圈旋尾；只有骨棒乱打隔着距离掷骨、留下地痕，
 *   反制方式是远离落点或站到不平的地面上（骨头弧线会偏），也可在掷出后走开让骨头砸空。
 *
 * 配置 `fissure`（裂地式）由 resolve 改时序、由公式改威力／震波／击数与骨速；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 把地表方块归到一个「被震裂」的对应材质；不认识的方块不动它。 */
    function bonerushMaterial(id: string): string {
        const value = String(id);
        if (value === "minecraft:grass_block" || value === "minecraft:dirt" || value === "minecraft:coarse_dirt" ||
            value === "minecraft:podzol" || value === "minecraft:rooted_dirt" || value === "minecraft:moss_block")
            return "minecraft:coarse_dirt";
        if (value === "minecraft:sand" || value === "minecraft:red_sand") return "minecraft:sandstone";
        if (value === "minecraft:deepslate") return "minecraft:cobbled_deepslate";
        if (value === "minecraft:stone" || value === "minecraft:granite" || value === "minecraft:diorite" ||
            value === "minecraft:andesite" || value === "minecraft:tuff" || value === "minecraft:gravel")
            return "minecraft:cobblestone";
        return "";
    }

    /** 落点周围一小片地表震成裂痕；每格记住原方块，到期由宿主换回来。返回改动的格子数。 */
    function bonerushFissure(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const r = Math.max(1, Math.ceil(radius)), limit = Math.max(8, Math.round(radius * radius * 8)), inner = 0;
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius || distance < inner) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 1; dy >= -2; dy--) {
                const y = baseY + dy, block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const key = x + "," + y + "," + z, cracked = bonerushMaterial(id);
                if (!seen[key] && cracked !== "" && cracked !== id) { seen[key] = true; cells.push({ x: x, y: y, z: z, block: cracked }); }
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: bonerushId,
        name: "Bone Rush",
        description: "The user attacks by striking the target with a hard bone. This move hits two to five times in a row.",
        uses: ["隔着距离把骨头一下下夯到目标脚下", "落点震波把一小片地面的人一起掀起", "裂地式用持久地痕占住战场"],
        kind: "enemy",
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
            let index = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

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
                sound(current, "minecraft:entity.arrow.shoot");
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: distance + 3, radius: boneRadius, direction: direction, gravity: gravity,
                    lifetime: life,
                    appearance: { item: "minecraft:bone", spin: true, scale: 0.9 } as any,
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        const scope2 = inner.world();
                        const at = hit.position();
                        const struck = hit.target();
                        WorldFeedback.emit(scope2, bonerushScene, 1, at,
                            { moment: "slam", index: shot, strikes: strikes, shock: shock, dust: dust,
                                final: shot >= strikes ? 1 : 0, intensity: Math.max(0.5, Math.min(2.4, hitPower / 28)) }, 22);
                        scope2.sound("minecraft:block.bone_block.break", at, 14, "{}");
                        WorldGeometry.selectEnemies(scope2, WorldGeometry.ring(at, 0, shock, { below: 2.0, above: 2.0 }),
                            function (other, facts) {
                                if (!hurt(inner, other, bonerushId, hitPower, { damage: damageSpec(bonerushId, "quake") })) return;
                                landed++;
                                const pos = facts.position();
                                if (scope2.valid(other) && lift > 0.02) scope2.displace(other, WorldCombat.point(0, lift, 0));
                                WorldFeedback.emit(scope2, bonerushScene, 1, pos,
                                    { moment: "hit", target: String(other.ref()), index: shot, strikes: strikes, dust: dust,
                                        intensity: Math.max(0.5, Math.min(2.4, hitPower / 28)) }, 20);
                            });
                        if (struck !== null && scope2.valid(struck)) scope2.sound("cobblemon:impact.ground", at, 14, "{}");
                        const cells = bonerushFissure(scope2, at, Math.max(1.0, shock * 0.9), crackTicks);
                        WorldFeedback.emit(scope2, bonerushScene, 1, at,
                            { moment: "crack", radius: Math.max(1.0, shock * 0.9), cells: cells, dust: dust,
                                index: shot, strikes: strikes, shock: shock }, 26);
                    }
                }, function (inner: CombatAction) {
                    inner.after(gap, function (next: CombatAction) { strike(next); });
                });
                WorldFeedback.keep(scope, "bonerush:bone:" + current.id() + ":" + shot, bonerushScene, 1, origin,
                    { moment: "throw", projectile: flight, index: shot, strikes: strikes, shock: shock, dust: dust,
                        intensity: Math.max(0.5, Math.min(2.4, hitPower / 28)) }, life + 20);
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
