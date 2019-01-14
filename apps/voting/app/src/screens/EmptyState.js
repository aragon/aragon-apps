import React from "react";
import styled from "styled-components";
import { EmptyStateCard } from "@aragon/ui";
import emptyIcon from "../assets/empty-card-icon.svg";

const EmptyState = ({ onActivate }) => (
  <Main>
    <EmptyStateCard
      title="Nothing here."
      text="Create a new poll to start using the app."
      actionText="New Poll"
      icon={<img src={emptyIcon} alt="" />}
      onActivate={onActivate}
    />
  </Main>
);

const Main = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
`;

export default EmptyState;
