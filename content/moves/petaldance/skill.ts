/**
 * 花瓣舞 / petaldance 的出手方式。
 *
 * 核心念头：原地旋转起舞，一圈圈花瓣从脚下卷起、向外卷成风暴，卷到的一圈敌人被割伤；舞步沿弧线漂开，
 *   走过的地方真的落下花瓣。它的身份是「隔着一段距离用特攻打一圈，还在地面留下花瓣」——
 *   它不像大闹一番那样贴身乱挥，画面本身就是一片旋转的花瓣风暴。
 *
 * 三幕（run 自管节奏，提交前只观察与预告）：
 *   起（提交前）：屈膝、脚下先聚起花瓣，只播预告。
 *   舞（提交后）：`strikes` 圈。每一圈以自己为圆心、罩住 `radius` 一圈，圈里的敌人各吃一记 `bloom` 范围特攻
 *       并被花瓣朝外轻推 `push` 格；随后自己沿弧线漂开 `drift` 格，并在落脚处按 `petals` 数落下
 *       `minecraft:pink_petals`（`terrain` 短租、`linger`，到期原方块回来）。两圈之间隔 `gap` 刻。
 *   晕（结束）：舞完给自己挂共享身份 world_combat:status/confusion（载体本单元自己的 effect），
 *       恍惚期间每次想出手都可能被打散、还被花瓣反割一下——这是旋转不止的代价。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害、状态、位移、方块都走同一条路。
 */
namespace PokemonSkills {
    /** 花瓣能落上去的土质地表：草方块、泥土、灰化土、苔藓、泥巴、耕地、菌丝、缠根土等。 */
    function petaldanceSoil(id: string): boolean {
        return /grass|dirt|podzol|moss|mud|farmland|mycelium|root/.test(id);
    }

    /** 在自己脚下按半径撒一圈花瓣；只放地表上方、且下面能承受花瓣的土质格，到期原方块回来。 */
    function petaldancePetals(world: CombatWorld, point: CombatPoint, radius: number, cells: number, ticks: number): number {
        const placed: any[] = [];
        const bx = Math.floor(point.x()), bz = Math.floor(point.z()), baseY = Math.floor(point.y());
        const rings: number[] = [0.5, 0.95, 1.35];
        for (let ring = 0; ring < rings.length && placed.length < cells; ring++) {
            const at = Math.max(0.6, radius * rings[ring]);
            const step = ring === 0 ? 1 : ring === 1 ? 5 : 7;
            for (let i = 0; i < step && placed.length < cells; i++) {
                const a = (i / step) * Math.PI * 2 + ring * 0.5;
                const x = bx + Math.round(Math.cos(a) * at), z = bz + Math.round(Math.sin(a) * at);
                for (let dy = 1; dy >= -3; dy--) {
                    const block = world.block(WorldCombat.point(x, baseY + dy, z));
                    if (block === null) continue;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock") break;
                    if (!petaldanceSoil(id)) break;
                    const above = world.block(WorldCombat.point(x, baseY + dy + 1, z));
                    if (above === null) break;
                    const aboveId = String(above.id());
                    if (aboveId !== "minecraft:air" && aboveId !== "minecraft:short_grass" && aboveId !== "minecraft:tall_grass") break;
                    placed.push({ x: x, y: baseY + dy + 1, z: z, block: "minecraft:pink_petals" });
                    break;
                }
            }
        }
        if (!placed.length) return 0;
        try { world.terrain(JSON.stringify({ cells: placed, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return placed.length;
    }

    interface PetalState { complete: (action: CombatAction) => void; left: number; strikes: number; index: number; }

    function petaldanceSpent(current: CombatAction, state: PetalState): void {
        const world = current.world(), actor = current.actor(), body = world.observe(actor);
        const ticks = Math.max(80, Math.round(p(petaldanceId, "dazeTicks", current)));
        const fumble = Math.round(Math.max(0.05, Math.min(0.9, p(petaldanceId, "fumble", current))) * 100);
        if (body !== null) {
            CombatStatus.apply(world, actor, "confusion", petaldanceDaze, ticks, fumble, { unique: true });
            WorldFeedback.emit(world, petaldanceScene, 1, body.position(),
                { moment: "spent", target: String(actor.ref()), strikes: state.strikes, fumble: fumble, ticks: ticks, intensity: 1 }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), petaldanceDazeText, [], 30);
            world.sound("cobblemon:status.volatile.confusion.actor", body.position(), 16, "{}");
        }
        state.complete(current);
    }

    function petaldanceStrike(current: CombatAction, state: PetalState): void {
        const world = current.world(), actor = current.actor();
        const self = world.observe(actor);
        if (self === null) { current.finish(); return; }
        const centre = self.position();
        const radius = Math.max(2.6, p(petaldanceId, "radius", current));
        const drift = Math.max(0, p(petaldanceId, "drift", current));
        const push = Math.max(0, p(petaldanceId, "push", current));
        const cells = Math.max(0, Math.round(p(petaldanceId, "petals", current)));
        const linger = Math.max(40, Math.round(p(petaldanceId, "linger", current)));
        const motes = Math.max(8, Math.round(p(petaldanceId, "motes", current)));
        const power = p(petaldanceId, "bloom", current);
        const intensity = Math.max(0.6, Math.min(2.6, power / 30 + state.index * 0.1));
        const scale = Math.max(0.7, Math.min(2.0, radius / 5.0));

        WorldFeedback.emit(world, petaldanceScene, 1, centre,
            { moment: "bloom", target: String(actor.ref()), index: state.index, left: state.left, strikes: state.strikes,
                motes: motes, scale: scale, intensity: intensity }, 22);
        sound(current, state.index === 0 ? "cobblemon:move.magicalleaf.actor_1" : "cobblemon:move.razorleaf.actor_1");

        WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: 1.8, above: 2.6 }),
            function (target, facts) {
                if (!hurt(current, target, petaldanceId, power, { damage: damageSpec(petaldanceId, "bloom") })) return;
                const away = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                if (world.valid(target) && away.length() > 0.05) world.displace(target, away.unit().scale(push));
                WorldFeedback.emit(world, petaldanceScene, 1, facts.position(),
                    { moment: "lash", target: String(target.ref()), motes: Math.round(motes * 0.6), scale: scale, intensity: intensity }, 20);
            });
        WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.35, 0)), petaldanceBloomText, [Math.round(power)], 24);
        sound(current, "cobblemon:impact.grass");

        // 沿弧线漂开一步，并在落脚处落下花瓣。
        if (drift > 0.02) {
            const angle = state.index * 2.2;
            world.displace(actor, WorldCombat.point(Math.cos(angle) * drift, 0, Math.sin(angle) * drift));
        }
        const settled = world.observe(actor);
        const where = settled !== null ? settled.position() : centre;
        const laid = cells > 0 ? petaldancePetals(world, where, radius, cells, linger) : 0;
        if (laid > 0) {
            WorldFeedback.emit(world, petaldanceScene, 1, where,
                { moment: "residue", target: String(actor.ref()), cells: laid, scale: scale, intensity: 0.8 }, 30);
            WorldFeedback.text(world, where.plus(WorldCombat.point(0, 1.2, 0)), petaldanceStepText, [laid], 22);
            world.sound("minecraft:block.grass.break", where, 12, "{}");
        }

        state.left = state.left - 1;
        state.index = state.index + 1;
        if (state.left > 0) {
            const pause = Math.max(7, Math.round(p(petaldanceId, "gap", current)));
            current.after(pause, function (next: CombatAction) { petaldanceStrike(next, state); });
        } else {
            petaldanceSpent(current, state);
        }
    }

    define({
        id: petaldanceId,
        cooldownParameter: "recharge",
        name: "Petal Dance",
        description: "原地旋舞，一圈圈花瓣从脚下卷成风暴：每一圈对周围一圈敌人造成范围特攻伤害并把它们轻推开；舞步沿弧线漂开，走过的地方落下花瓣。舞完自己陷入恍惚，出手可能被打散。旋舞式漂得更远、范围更宽、花瓣留得更久。",
        uses: ["隔着一段距离削一圈贴过来的敌人", "用特攻处理一堆低特防目标", "把花瓣留在地上标记自己舞过的区域"],
        kind: "enemy",
        range: 5.0,
        maxRange: 7.4,
        prepare: 9,
        active: 0,
        recover: 10,
        cooldown: 40,
        maximumTicks: 260,
        style: "petalstorm",
        interruptible: false,
        defaults: { drift: false, ai: { maxChase: 12, minFoes: 1, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(petaldanceId, "radius", pokemon), geometry: "circle", style: "petalstorm", color: 0xE58FB0,
                label: config && config.drift === true ? "花瓣舞·旋舞" : "花瓣舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[petaldanceId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(petaldanceId, "tempo", context)),
                recover: Math.round(p(petaldanceId, "recover", context)),
                cooldown: Math.round(p(petaldanceId, "recharge", context)),
                active: 0,
                range: p(petaldanceId, "radius", context)
            };
        },
        run: function (action, move, config) {
            const driftMode = !!(config && config.drift);
            const prepare = Math.max(3, Math.round(p(petaldanceId, "tempo", action)));
            action.present(petaldanceId + ":windup", petaldanceScene, 1, action.origin(),
                JSON.stringify({ moment: "tempo", drift: driftMode ? 1 : 0 }));
            LivingActions.run(action, {
                prepare: prepare, recover: Math.max(0, Math.round(p(petaldanceId, "recover", action))),
                cooldown: Math.max(1, Math.round(p(petaldanceId, "recharge", action))),
                stationary: true, turn: 15, interruptible: false
            }, function (current, complete) {
                const strikes = Math.max(2, Math.min(3, Math.round(p(petaldanceId, "strikes", current))));
                const state: PetalState = { complete: complete, left: strikes, strikes: strikes, index: 0 };
                sound(current, "cobblemon:move.razorleaf.actor_2");
                petaldanceStrike(current, state);
            });
        }
    });

    // 失手反应：共享门禁掷中后出手作废；花瓣反割、恍惚续上（本单元的失败反应）。
    WorldCombat.on(petaldanceId + ":fumble", "world_combat:action_rejected", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.reason) !== "confused" && String(data.details && data.details.status) !== "confusion") return;
        const world = event.world(), actor = event.actor();
        // The rejection details name the exact carrier that rolled the fumble, so a stack of confusion sources
        // cannot make one rejection fire several units' punishments.
        const carrier = data.details && data.details.effect !== undefined ? String(data.details.effect) : "";
        if (carrier && carrier !== petaldanceDaze) return;
        const effect = CombatStatus.representative(world, actor, "confusion");
        if (effect === null || String(effect.id()) !== petaldanceDaze) return;
        const body = world.observe(actor);
        if (body !== null) {
            let specialAttack = 0;
            try { specialAttack = PokemonDamage.combatants.read(world, actor).stats.spa || 0; } catch (error) { specialAttack = 0; }
            const fraction = Math.max(0.012, Math.min(0.05, 0.010 + specialAttack * 0.00011));
            const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
            if (loss > 0) {
                const remaining = Math.max(0, effect.duration());
                CombatStatus.apply(world, actor, "confusion", petaldanceDaze, Math.max(60, remaining), effect.amplifier(), { unique: true });
                WorldFeedback.emit(world, petaldanceScene, 1, body.position(), { moment: "punish", target: String(actor.ref()) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), petaldanceChipText, [Math.round(loss * 10) / 10], 24);
                world.sound("minecraft:entity.player.hurt", body.position(), 12, "{}");
            }
        }
    });

    // 恍惚存续期：低密度的眩晕气流每 20 刻续期，让出本体视线。
    WorldCombat.on(petaldanceId + ":linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== petaldanceDaze) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, petaldanceId + ":dizzy:" + String(actor.ref()), petaldanceScene, 1, body.position(),
            { moment: "dizzy", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
