/** Native NPC teams retain their declared format; shared decisions retain each move and individual's behavior. */
TrainerChallenges.policies.define({
    id: "world_combat:native_trainer_skill",
    apply: plan => { plan.policy.decisionTicks = 8 - Math.max(0, Math.min(5, plan.challenge.skill())); }
});
TrainerChallenges.install({ decisionTicks: 4, replacementTicks: 16, arenaRadius: 48,
    leaveGraceTicks: 100, deploymentTimeout: 100, spawnDistances: [4, 7, 10] });
