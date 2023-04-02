

export const testErrors = {
  vectorSize : /Invalid vector size. Must be equal to the dimension of the space./,
  vectorArgument : /Cannot convert .* to float/,
  
  unsignedIntArgument : /Cannot convert .* to unsigned int/,
  
  arugmentCount : /called with .* arguments, expected .* args!/,
  
  stringArgument : /Cannot pass non-string to std::string/,
}

export type testErrorTypes = keyof typeof  testErrors;