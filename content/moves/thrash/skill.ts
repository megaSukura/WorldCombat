/**
 * 大闹一番 / thrash 的出手方式。
 *
 * 核心念头：站在原地转着圈乱打，每一挥都罩住身边一圈人，把够得着的全朝外震开；越闹越站不稳，最后一下重重跺地。
 *   它的身份是「不看目标、罩住一圈」——它不追谁，谁站在旁边谁挨打；转着打，方向每一下都不一样。
 *
 * 三幕（run 自管节奏，提交前只观察与预告）：
 *   起（提交前）：踏地、抡起一条手臂，只播预告。
 *   闹（提交后）：`strikes` 次乱挥。每一挥以自己为圆心、罩住 `radius` 一圈，圈里的敌人各吃一记 `bash` 接触伤害
 *       并被朝外震开 `push` 格；同时自己随机踉跄 `step` 格、转向最近的敌人；狂乱式下每挥还磕伤自己一点。
 *       最后一挥是重跺，另乘 `finisher`。两挥之间隔 `gap` 刻。
 *   晕（结束）：闹完给自己挂共享身份 world_combat:status/confusion（载体本单元自己的 effect），
 *       恍惚期间每次想出手都可能被打散、还被自己磕伤——这是不看目标乱挥的代价。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害、状态、位移都走同一条路。
 */
namespace PokemonSkills {
    interface ThrashState { left: number; strikes: number; index: number; }

    function thrashSpent(current: CombatAction, state: ThrashState): void {
        const world = current.world(), actor = current.actor(), body = world.observe(actor);
        const ticks = Math.max(80, Math.round(p(thrashId, "dazeTicks", current)));
        const fumble = Math.round(Math.max(0.05, Math.min(0.9, p(thrashId, "fumble", current))) * 100);
        if (body !== null) {
            CombatStatus.apply(world, actor, "confusion", thrashDaze, ticks, fumble, { unique: true });
            WorldFeedback.emit(world, thrashScene, 1, body.position(),
                { moment: "spent", target: String(actor.ref()), strikes: state.strikes, fumble: fumble, ticks: ticks, intensity: 1 }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), thrashDazeText, [], 30);
            world.sound("cobblemon:status.volatile.confusion.actor", body.position(), 16, "{}");
        }
        current.finish();
    }

    function thrashStrike(current: CombatAction, state: ThrashState): void {
        const world = current.world(), actor = current.actor();
        const self = world.observe(actor);
        if (self === null) { current.finish(); return; }
        const centre = self.position();
        const radius = Math.max(1.6, p(thrashId, "radius", current));
        const push = Math.max(0, p(thrashId, "push", current));
        const step = Math.max(0, p(thrashId, "step", current));
        const dust = Math.max(6, Math.round(p(thrashId, "dust", current)));
        const recoil = Math.max(0, p(thrashId, "recoil", current));
        const final = state.left <= 1;
        const power = p(thrashId, "bash", current) * (final ? p(thrashId, "finisher", current) : 1);
        const intensity = Math.max(0.6, Math.min(2.6, power / 24 + state.index * 0.12));
        const scale = Math.max(0.7, Math.min(2.2, radius / 3.4));

        // 转向最近的敌人，让「转着打」有明确的朝向读法。
        const near = world.query(centre, radius + 1.5, false);
        for (let i = 0; i < near.length; i++) {
            const other = near[i];
            if (world.friendly(other)) continue;
            const facts = world.observe(other);
            if (facts === null || !facts.visible()) continue;
            current.face(facts.position(), 30, 30);
            break;
        }

        WorldFeedback.emit(world, thrashScene, 1, centre,
            { moment: final ? "stomp" : "flail", target: String(actor.ref()), index: state.index,
                left: state.left, strikes: state.strikes, dust: dust, scale: scale, intensity: intensity }, final ? 28 : 20);
        sound(current, final ? "minecraft:entity.generic.big_fall" : "cobblemon:impact.normal");
        sound(current, "minecraft:entity.player.attack.sweep");

        let hits = 0;
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: 1.6, above: 2.4 }),
            function (target, facts) {
                if (!hurt(current, target, thrashId, power, { damage: damageSpec(thrashId, "bash"), contact: true })) return;
                hits++;
                const away = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                if (away.length() > 0.05) world.displace(target, away.unit().scale(push));
                WorldFeedback.emit(world, thrashScene, 1, facts.position(),
                    { moment: "knock", target: String(target.ref()), dust: dust, scale: scale, intensity: intensity }, 20);
            });

        if (hits > 0) {
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)),
                final ? thrashStompText : thrashFlailText, [Math.round(power)], 26);
        }

        // 自己站不稳：随机踉跄一小步。
        if (step > 0.02) {
            const angle = world.random() * Math.PI * 2;
            world.displace(actor, WorldCombat.point(Math.cos(angle) * step, 0, Math.sin(angle) * step));
        }
        // 狂乱式：每一挥磕伤自己一点。
        if (recoil > 0.0001) {
            const loss = -world.health(actor, -self.maxHealth() * recoil, "world_combat:thrash_recoil");
            if (loss > 0) {
                WorldFeedback.emit(world, thrashScene, 1, centre, { moment: "reckless", target: String(actor.ref()) }, 18);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.2, 0)), thrashChipText, [Math.round(loss * 10) / 10], 22);
            }
        }

        state.left = state.left - 1;
        state.index = state.index + 1;
        if (state.left > 0) {
            const pause = Math.max(5, Math.round(p(thrashId, "gap", current)));
            current.after(pause, function (next: CombatAction) { thrashStrike(next, state); });
        } else {
            thrashSpent(current, state);
        }
    }

    define({
        id: thrashId,
        name: "Thrash",
        description: "站在原地转着圈乱挥：每一挥罩住周围一圈敌人、造成接触伤害并把它们朝外震开，最后一记重跺另乘倍率；闹完自己陷入恍惚，出手可能被打散。狂乱式罩得更宽、推得更狠，但每一挥都会磕伤自己。",
        uses: ["被围住时一次罩住身边所有人", "把贴身的敌人一起震开", "用连续的范围接触伤害清掉身边的小目标"],
        kind: "enemy",
        range: 3.4,
        maxRange: 5.2,
        prepare: 7,
        active: 0,
        recover: 9,
        cooldown: 38,
        maximumTicks: 240,
        style: "flurry",
        interruptible: false,
        defaults: { wild: false, ai: { maxChase: 8, minFoes: 1, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(thrashId, "radius", pokemon), geometry: "circle", style: "flurry", color: 0xC9A227,
                label: config && config.wild === true ? "大闹一番·狂乱" : "大闹一番" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[thrashId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(thrashId, "tempo", context)),
                recover: Math.round(p(thrashId, "recover", context)),
                cooldown: Math.round(p(thrashId, "recharge", context)),
                active: 0,
                range: p(thrashId, "radius", context)
            };
        },
        run: function (action, move, config) {
            const wild = !!(config && config.wild);
            const prepare = Math.max(3, Math.round(p(thrashId, "tempo", action)));
            action.present(thrashId + ":windup", thrashScene, 1, action.origin(),
                JSON.stringify({ moment: "tempo", wild: wild ? 1 : 0 }));
            action.after(prepare, function (current: CombatAction) {
                const cooldown = Math.max(1, Math.round(p(thrashId, "recharge", current)));
                current.commit(cooldown);
                const strikes = Math.max(2, Math.min(3, Math.round(p(thrashId, "strikes", current))));
                const state: ThrashState = { left: strikes, strikes: strikes, index: 0 };
                sound(current, "minecraft:entity.ravager.roar");
                thrashStrike(current, state);
            });
        }
    });

    // 失手反应：共享门禁掷中后出手作废；自己磕伤、恍惚续上（本单元的失败反应）。
    WorldCombat.on(thrashId + ":fumble", "world_combat:action_rejected", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.reason) !== "confused" && String(data.details && data.details.status) !== "confusion") return;
        const world = event.world(), actor = event.actor();
        // The rejection details name the exact carrier that rolled the fumble, so a stack of confusion sources
        // cannot make one rejection fire several units' punishments.
        const carrier = data.details && data.details.effect !== undefined ? String(data.details.effect) : "";
        if (carrier && carrier !== thrashDaze) return;
        const effect = CombatStatus.representative(world, actor, "confusion");
        if (effect === null || String(effect.id()) !== thrashDaze) return;
        const body = world.observe(actor);
        if (body !== null) {
            let attack = 0;
            try { attack = PokemonDamage.combatants.read(world, actor).stats.atk || 0; } catch (error) { attack = 0; }
            const fraction = Math.max(0.012, Math.min(0.05, 0.010 + attack * 0.00011));
            const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
            if (loss > 0) {
                const remaining = Math.max(0, effect.duration());
                CombatStatus.apply(world, actor, "confusion", thrashDaze, Math.max(60, remaining), effect.amplifier(), { unique: true });
                WorldFeedback.emit(world, thrashScene, 1, body.position(), { moment: "punish", target: String(actor.ref()) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), thrashChipText, [Math.round(loss * 10) / 10], 24);
                world.sound("minecraft:entity.player.hurt", body.position(), 12, "{}");
            }
        }
    });

    // 恍惚存续期：低密度的眩晕气流每 20 刻续期，让出本体视线。
    WorldCombat.on(thrashId + ":linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== thrashDaze) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, thrashId + ":dizzy:" + String(actor.ref()), thrashScene, 1, body.position(),
            { moment: "dizzy", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
