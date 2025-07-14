<template>
    <div 
      class="card-container"
      :class="{ 'dealing': isDealing }"
      @click="$emit('cardClick', card)"
    >
      <div 
        class="card-svg" 
        v-html="cardSvg"
        :class="cardClasses"
      ></div>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  import { generateCardSvg } from '../utils/cardSvg'
  
  const props = defineProps({
    card: {
      type: Object,
      required: true
    },
    faceDown: {
      type: Boolean,
      default: false
    },
    size: {
      type: String,
      default: 'normal' // 'small', 'normal', 'large'
    },
    isDealing: {
      type: Boolean,
      default: false
    }
  })
  
  const emit = defineEmits(['cardClick'])
  
  const cardSvg = computed(() => {
    return generateCardSvg(
      props.card.value, 
      props.card.suit, 
      props.faceDown || props.card.faceDown
    )
  })
  
  const cardClasses = computed(() => {
    return {
      [`card-${props.size}`]: true,
      'card-red': isRed.value,
      'card-black': !isRed.value,
      'face-down': props.faceDown || props.card.faceDown
    }
  })
  
  const isRed = computed(() => {
    return props.card.suit === 'hearts' || props.card.suit === 'diamonds'
  })
  </script>
  
  <style scoped>
  .card-container {
    display: inline-block;
    margin: 2px;
    transition: transform 0.3s ease;
  }
  
  .card-container.dealing {
    animation: dealCard 0.5s ease-out;
  }
  
  .card-svg {
    width: 60px;
    height: 84px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
  }
  
  .card-small .card-svg {
    width: 40px;
    height: 56px;
  }
  
  .card-large .card-svg {
    width: 80px;
    height: 112px;
  }
  
  .card-svg:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  @keyframes dealCard {
    0% {
      transform: translateX(-100px) rotate(-10deg);
      opacity: 0;
    }
    100% {
      transform: translateX(0) rotate(0deg);
      opacity: 1;
    }
  }
  
  @media (max-width: 480px) {
    .card-svg {
      width: 50px;
      height: 70px;
    }
    
    .card-small .card-svg {
      width: 35px;
      height: 49px;
    }
  }
  </style>